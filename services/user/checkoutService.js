import Cart from "../../models/Cart.js";
import Address from "../../models/Address.js";
import Order from "../../models/Order.js";
import Coupon from "../../models/Coupon.js";
import CouponUsage from "../../models/CouponUsage.js";
import Variant from "../../models/Variant.js";

import { calculateCheckoutTotals } from "../shared/pricingService.js";
import { debitWallet, creditWallet } from "../shared/walletService.js";
import { createRazorpayOrder, verifyRazorpaySignature } from "./razorpayService.js";
import { calculateItemOffer } from "../shared/offerService.js";

const PAYMENT_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/* =========================================
   LOAD CHECKOUT SERVICE
========================================= */
export const loadCheckoutService = async (userId, couponCode = null) => {
    const cart = await Cart.findOne({ userId })
        .populate({ path: "items.productId" })
        .populate({ path: "items.variantId" })
        .lean();

    if (!cart || cart.items.length === 0) return { success: false, message: "Cart is empty" };

    const validItems = cart.items.filter(item =>
        item.productId && item.variantId &&
        item.productId.isActive && !item.productId.isDeleted &&
        item.variantId.isActive && !item.variantId.isDeleted &&
        item.variantId.stock > 0
    );

    for (const item of validItems) {
        const offerData    = await calculateItemOffer(item.productId, item.variantId, item.quantity);
        item.originalPrice = offerData.originalPrice;
        item.finalPrice    = offerData.finalPrice;
        item.offerDiscount = offerData.offerDiscount;
        item.appliedOffer  = offerData.appliedOffer;
        item.badgeLabel    = offerData.badgeLabel;
    }

    let totalItems = 0;
    validItems.forEach(item => { totalItems += item.quantity; });

    const totals = await calculateCheckoutTotals({ cartItems: validItems, userId, couponCode });

    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();

    const availableCoupons = await Coupon.find({
        isDeleted: false, isActive: true,
        startDate: { $lte: new Date() }, endDate: { $gte: new Date() },
    }).sort({ createdAt: -1 }).lean();

    return {
        success: true, cartItems: validItems, addresses, availableCoupons,
        subtotal: totals.subtotal, offerDiscount: totals.offerDiscount,
        couponDiscount: totals.couponDiscount, totalItems,
        taxAmount: totals.taxAmount, deliveryCharge: totals.deliveryCharge,
        finalAmount: totals.finalAmount,
    };
};

/* =========================================
   SHARED HELPERS
========================================= */
const generateOrderId = () => {
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `IST${Date.now()}${random}`;
};

const buildOrderItems = async (cartItems) => {
    const orderItems = [];
    for (const item of cartItems) {
        const offerData = await calculateItemOffer(item.productId, item.variantId, item.quantity);
        orderItems.push({
            productId: item.productId._id, variantId: item.variantId._id,
            productName: item.productId.name,
            productImage: item.variantId.images?.[0] || item.productId.thumbnail,
            variantName: [item.variantId.color, item.variantId.storage].filter(Boolean).join(" • "),
            quantity: item.quantity, originalPrice: item.price,
            finalPrice: offerData.finalPrice, offerDiscount: offerData.offerDiscount,
            price: offerData.finalPrice,
        });
    }
    return orderItems;
};

const revalidateStock = (cartItems) => {
    for (const item of cartItems) {
        if (!item.productId || !item.productId.isActive || item.productId.isDeleted)
            return { valid: false, message: `${item.productId?.name || "Product"} is unavailable` };
        if (!item.variantId || !item.variantId.isActive || item.variantId.isDeleted)
            return { valid: false, message: `${item.productId.name} variant is unavailable` };
        if (item.variantId.stock <= 0)
            return { valid: false, message: `${item.productId.name} is out of stock` };
        if (item.quantity > item.variantId.stock)
            return { valid: false, message: `Only ${item.variantId.stock} units available for ${item.productId.name}` };
    }
    return { valid: true };
};

const deductStockAtomically = async (cartItems) => {
    const decremented = [];
    for (const item of cartItems) {
        const updated = await Variant.findOneAndUpdate(
            { _id: item.variantId._id, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { new: true },
        );
        if (!updated) {
            for (const done of decremented)
                await Variant.findByIdAndUpdate(done.variantId, { $inc: { stock: done.quantity } });
            return { success: false, message: `${item.productId.name} just went out of stock. Please review your cart.` };
        }
        decremented.push({ variantId: item.variantId._id, quantity: item.quantity });
    }
    return { success: true };
};

const revalidateCoupon = async (couponCode, subtotal, userId) => {
    if (!couponCode) return { valid: true, coupon: null };
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true, isDeleted: false });
    if (!coupon) return { valid: false, message: "Coupon is no longer valid" };
    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) return { valid: false, message: "Coupon has expired" };
    if (coupon.totalUsageLimit && coupon.usedCount >= coupon.totalUsageLimit) return { valid: false, message: "Coupon usage limit reached" };
    const usageCount = await CouponUsage.countDocuments({ couponId: coupon._id, userId });
    if (usageCount >= coupon.userUsageLimit) return { valid: false, message: "You have already used this coupon" };
    if (subtotal < coupon.minPurchase) return { valid: false, message: `Minimum purchase Rs.${coupon.minPurchase} required` };
    return { valid: true, coupon };
};

const recordCouponUsage = async (couponId, userId, orderId) => {
    if (!couponId) return;
    await CouponUsage.create({ couponId, userId, orderId });
    await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
};

/* =========================================
   RESTORE STOCK FOR EXPIRED ORDER
   Called when payment window expires.
   isStockRestored guard prevents double-run.
========================================= */
export const restoreStockForExpiredOrder = async (order) => {
    if (order.isStockRestored) return;
    for (const item of order.items) {
if (
    item.itemStatus === "Cancelled" ||
    item.itemStatus === "Returned"
)
{
    continue;
}

await Variant.findByIdAndUpdate(
    item.variantId,
    {
        $inc: {
            stock: item.quantity
        }
    }
);

item.itemStatus = "Cancelled";
    }
    order.orderStatus     = "Cancelled";
    order.paymentStatus   = "Failed";
    order.isStockRestored = true;
    order.cancelReason    = "Payment window expired — order auto-cancelled";
    await order.save();
};

/* =========================================
   PLACE ORDER — COD
========================================= */
export const placeOrderCODService = async (userId, addressId, deliveryType = "standard", paymentMethod = "COD", couponCode = null) => {
    const cart = await Cart.findOne({ userId }).populate("items.productId").populate("items.variantId");
    if (!cart || cart.items.length === 0) return { success: false, message: "Cart is empty" };

    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) return { success: false, message: "Address not found" };

    const stockCheck = revalidateStock(cart.items);
    if (!stockCheck.valid) return { success: false, message: stockCheck.message };

    const totals = await calculateCheckoutTotals({ cartItems: cart.items, userId, couponCode, deliveryType });

    if (couponCode) {
        const couponCheck = await revalidateCoupon(couponCode, totals.subtotal - totals.offerDiscount, userId);
        if (!couponCheck.valid) return { success: false, message: couponCheck.message };
    }

    const stockDeduction = await deductStockAtomically(cart.items);
    if (!stockDeduction.success) return { success: false, message: stockDeduction.message };

    const orderItems = await buildOrderItems(cart.items);

    const order = await Order.create({
        userId, orderId: generateOrderId(), items: orderItems,
        shippingAddress: { fullName: address.fullName, phoneNumber: address.phoneNumber, addressLine1: address.addressLine1, city: address.city, state: address.state, country: address.country, pincode: address.pincode },
        paymentMethod, paymentStatus: paymentMethod === "COD" ? "Pending" : "Paid",
        subtotal: totals.subtotal, discountAmount: totals.offerDiscount + totals.couponDiscount,
        offerDiscount: totals.offerDiscount, couponDiscount: totals.couponDiscount,
        couponCode: totals.coupon?.code || null, couponId: totals.coupon?._id || null,
        taxAmount: totals.taxAmount, deliveryCharge: totals.deliveryCharge, finalAmount: totals.finalAmount,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    if (totals.coupon) await recordCouponUsage(totals.coupon._id, userId, order._id);
    cart.items = [];
    await cart.save();
    return { success: true, order };
};

/* =========================================
   PLACE ORDER — WALLET
========================================= */
export const placeOrderWalletService = async (userId, addressId, deliveryType = "standard", couponCode = null) => {
    const cart = await Cart.findOne({ userId }).populate("items.productId").populate("items.variantId");
    if (!cart || cart.items.length === 0) return { success: false, message: "Cart is empty" };

    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) return { success: false, message: "Address not found" };

    const stockCheck = revalidateStock(cart.items);
    if (!stockCheck.valid) return { success: false, message: stockCheck.message };

    const totals = await calculateCheckoutTotals({ cartItems: cart.items, userId, couponCode, deliveryType });

    if (couponCode) {
        const couponCheck = await revalidateCoupon(couponCode, totals.subtotal - totals.offerDiscount, userId);
        if (!couponCheck.valid) return { success: false, message: couponCheck.message };
    }

    const walletResponse = await debitWallet({ userId, amount: totals.finalAmount, transactionType: "OrderPayment", description: "Wallet payment for order" });
    if (!walletResponse.success) return { success: false, message: "Insufficient wallet balance" };

    const stockDeduction = await deductStockAtomically(cart.items);
    if (!stockDeduction.success) {
        await creditWallet({ userId, amount: totals.finalAmount, transactionType: "OrderPaymentRefund", description: "Refund — order could not be placed (stock unavailable)" });
        return { success: false, message: stockDeduction.message };
    }

    const orderItems = await buildOrderItems(cart.items);

    const order = await Order.create({
        userId, orderId: generateOrderId(), items: orderItems,
        shippingAddress: { fullName: address.fullName, phoneNumber: address.phoneNumber, addressLine1: address.addressLine1, city: address.city, state: address.state, country: address.country, pincode: address.pincode },
        paymentMethod: "WALLET", paymentStatus: "Paid",
        subtotal: totals.subtotal, discountAmount: totals.offerDiscount + totals.couponDiscount,
        offerDiscount: totals.offerDiscount, couponDiscount: totals.couponDiscount,
        couponCode: totals.coupon?.code || null, couponId: totals.coupon?._id || null,
        taxAmount: totals.taxAmount, deliveryCharge: totals.deliveryCharge, finalAmount: totals.finalAmount,
        walletAmountUsed: totals.finalAmount,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    if (totals.coupon) await recordCouponUsage(totals.coupon._id, userId, order._id);
    cart.items = [];
    await cart.save();
    return { success: true, order };
};

/* =========================================
   RAZORPAY CHECKOUT
========================================= */
export const createRazorpayCheckoutService = async (userId, addressId, deliveryType = "standard", couponCode = null) => {
    const cart = await Cart.findOne({ userId }).populate("items.productId").populate("items.variantId");
    if (!cart || cart.items.length === 0) return { success: false, message: "Cart is empty" };

    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) return { success: false, message: "Address not found" };

    const stockCheck = revalidateStock(cart.items);
    if (!stockCheck.valid) return { success: false, message: stockCheck.message };

    const totals = await calculateCheckoutTotals({ cartItems: cart.items, userId, couponCode, deliveryType });

    if (couponCode) {
        const couponCheck = await revalidateCoupon(couponCode, totals.subtotal - totals.offerDiscount, userId);
        if (!couponCheck.valid) return { success: false, message: couponCheck.message };
    }

    const razorpayResponse = await createRazorpayOrder({ amount: totals.finalAmount });
    if (!razorpayResponse.success) return { success: false, message: "Failed to initiate payment" };

    const stockDeduction = await deductStockAtomically(cart.items);
    if (!stockDeduction.success) return { success: false, message: stockDeduction.message };

    const orderItems = await buildOrderItems(cart.items);

    const order = await Order.create({
        userId, orderId: generateOrderId(), items: orderItems,
        shippingAddress: { fullName: address.fullName, phoneNumber: address.phoneNumber, addressLine1: address.addressLine1, city: address.city, state: address.state, country: address.country, pincode: address.pincode },
        paymentMethod: "RAZORPAY", paymentStatus: "Failed",
        razorpayOrderId: razorpayResponse.razorpayOrder.id,
        subtotal: totals.subtotal, discountAmount: totals.offerDiscount + totals.couponDiscount,
        offerDiscount: totals.offerDiscount, couponDiscount: totals.couponDiscount,
        couponCode: totals.coupon?.code || null, couponId: totals.coupon?._id || null,
        taxAmount: totals.taxAmount, deliveryCharge: totals.deliveryCharge, finalAmount: totals.finalAmount,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        paymentExpiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MS), /* FIX 5 */
    });

    cart.items = [];
    await cart.save();

    return { success: true, razorpayOrder: razorpayResponse.razorpayOrder, amount: totals.finalAmount, orderId: order.orderId };
};

/* =========================================
   VERIFY RAZORPAY PAYMENT
========================================= */
export const verifyRazorpayPaymentService = async ({ userId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
    const isValid = verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
    if (!isValid) return { success: false, message: "Payment verification failed" };

    const order = await Order.findOne({ userId, razorpayOrderId });
    if (!order) return { success: false, message: "Order not found for this payment" };

    /* FIX 5 — reject if window expired */
    if (order.paymentExpiresAt && new Date() > order.paymentExpiresAt) {
        return { success: false, message: "Payment window expired. Please retry your order from the Orders page." };
    }

    order.paymentStatus     = "Paid";
    order.paymentId         = razorpayPaymentId;
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    order.orderStatus       = "Pending";
    order.items.forEach(item => {
    item.itemStatus = "Pending";
});
    order.paymentExpiresAt  = null;
    await order.save();

    if (order.couponId) {

    const alreadyUsed = await CouponUsage.findOne({
        couponId: order.couponId,
        orderId: order._id,
    });

    if (!alreadyUsed) {
        await recordCouponUsage(
            order.couponId,
            userId,
            order._id
        );
    }
}

    return { success: true, order };
};

/* =========================================
   LOAD RETRY CHECKOUT PAGE DATA
========================================= */
export const loadRetryCheckoutService = async (userId, orderId) => {
    const order = await Order.findOne({ userId, orderId }).lean();
    if (!order) return { success: false, message: "Order not found" };

    if (order.paymentMethod !== "RAZORPAY" || order.paymentStatus !== "Failed") {
        return { success: false, message: "This order cannot be retried" };
    }

    /* FIX 5 — check expiry before showing retry page */
    if (order.paymentExpiresAt && new Date() > order.paymentExpiresAt && !order.isStockRestored) {
        const liveOrder = await Order.findOne({ userId, orderId });
        await restoreStockForExpiredOrder(liveOrder);
        return {
            success: false,
            message: "Payment window expired. Your order has been cancelled and stock restored. Please place a new order.",
            expired: true,
        };
    }

    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 }).lean();

    return { success: true, order, addresses };
};

/* =========================================
   RETRY ORDER PAYMENT SERVICE
   Supports COD / WALLET / RAZORPAY.
   Stock is already reserved — no cart involved.
========================================= */
export const retryOrderPaymentService = async ({ userId, orderId, addressId, paymentMethod }) => {
    const order = await Order.findOne({ userId, orderId });
    if (!order) return { success: false, message: "Order not found" };

    if (order.paymentMethod !== "RAZORPAY" || order.paymentStatus !== "Failed") {
        return { success: false, message: "This order cannot be retried" };
    }

    /* FIX 5 — expiry check */
    if (order.paymentExpiresAt && new Date() > order.paymentExpiresAt && !order.isStockRestored) {
        await restoreStockForExpiredOrder(order);
        return { success: false, message: "Payment window has expired. Your order was cancelled. Please place a new order.", expired: true };
    }

    /* Update address if changed */
    if (addressId) {
        const address = await Address.findOne({ _id: addressId, userId });
        if (!address) return { success: false, message: "Selected address not found" };
        order.shippingAddress = {
            fullName: address.fullName, phoneNumber: address.phoneNumber,
            addressLine1: address.addressLine1, city: address.city,
            state: address.state, country: address.country, pincode: address.pincode,
        };
    }

    /* ── COD ── */
    if (paymentMethod === "COD") {
          order.paymentMethod    = "COD";

          order.paymentStatus    = "Pending";

          order.orderStatus      = "Pending";

          order.paymentId        = null;

          order.razorpayOrderId  = null;

          order.razorpayPaymentId = null;

          order.razorpaySignature = null;

          order.paymentExpiresAt = null;
        await order.save();
        return { success: true, paymentMethod: "COD", redirectUrl: `/order-success/${order.orderId}` };
    }

    /* ── WALLET ── */
    if (paymentMethod === "WALLET") {
        const walletResponse = await debitWallet({
            userId, amount: order.finalAmount,
            transactionType: "OrderPayment",
            description: `Wallet payment for retry of order ${order.orderId}`,
            orderId: order._id,
        });
        if (!walletResponse.success) return { success: false, message: "Insufficient wallet balance" };

        order.paymentMethod    = "WALLET";
        order.paymentStatus    = "Paid";
        order.paymentId = walletResponse.transactionId || null;
        order.orderStatus      = "Pending";
        order.walletAmountUsed = order.finalAmount;

        order.paymentId = walletResponse.transactionId || null;

        order.razorpayOrderId = null;

        order.razorpayPaymentId = null;

        order.razorpaySignature = null;

        order.paymentExpiresAt = null;
        await order.save();

        if (order.couponId) {

    const alreadyUsed = await CouponUsage.findOne({
        couponId: order.couponId,
        orderId: order._id,
    });

    if (!alreadyUsed) {
        await recordCouponUsage(
            order.couponId,
            userId,
            order._id
        );
    }
}

        return { success: true, paymentMethod: "WALLET", redirectUrl: `/order-success/${order.orderId}` };
    }

    /* ── RAZORPAY ── */
    if (paymentMethod === "RAZORPAY") {
        const razorpayResponse = await createRazorpayOrder({ amount: order.finalAmount });
        if (!razorpayResponse.success) return { success: false, message: "Failed to initiate payment" };

        order.razorpayOrderId  = razorpayResponse.razorpayOrder.id;
        order.paymentExpiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MS);
        order.retryCount += 1;
        await order.save();

        return { success: true, paymentMethod: "RAZORPAY", razorpayOrder: razorpayResponse.razorpayOrder, amount: order.finalAmount };
    }

    return { success: false, message: "Invalid payment method" };
};

/* =========================================
   RETRY RAZORPAY PAYMENT SERVICE (legacy)
========================================= */
export const retryRazorpayPaymentService = async (userId, orderId) => {
    const order = await Order.findOne({ userId, orderId });
    if (!order)                             return { success: false, message: "Order not found" };
    if (order.paymentStatus === "Paid")     return { success: false, message: "This order is already paid" };
    if (order.paymentMethod !== "RAZORPAY") return { success: false, message: "This order does not use Razorpay" };

    if (order.paymentExpiresAt && new Date() > order.paymentExpiresAt && !order.isStockRestored) {
        await restoreStockForExpiredOrder(order);
        return { success: false, message: "Payment window expired. Please place a new order.", expired: true };
    }

    const razorpayResponse = await createRazorpayOrder({ amount: order.finalAmount });
    if (!razorpayResponse.success) return { success: false, message: "Failed to create payment session" };

    order.razorpayOrderId  = razorpayResponse.razorpayOrder.id;
    order.paymentExpiresAt = new Date(Date.now() + PAYMENT_EXPIRY_MS);
    order.retryCount += 1;
    await order.save();

    return { success: true, razorpayOrder: razorpayResponse.razorpayOrder, amount: order.finalAmount, orderId: order.orderId };
};