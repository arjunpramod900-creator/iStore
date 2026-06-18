import Cart from "../../models/Cart.js";
import Address from "../../models/Address.js";
import Order from "../../models/Order.js";
import Coupon from "../../models/Coupon.js";
import CouponUsage from "../../models/CouponUsage.js";
import Variant from "../../models/Variant.js";

import { calculateCheckoutTotals } from "../shared/pricingService.js";
import { debitWallet }             from "../shared/walletService.js";
import { createRazorpayOrder, verifyRazorpaySignature } from "./razorpayService.js";
import { calculateItemOffer }      from "../shared/offerService.js";

/* =========================================
   LOAD CHECKOUT SERVICE
========================================= */
export const loadCheckoutService = async (userId, couponCode = null) => {

    const cart = await Cart.findOne({ userId })
        .populate({ path: "items.productId" })
        .populate({ path: "items.variantId" })
        .lean();

    if (!cart || cart.items.length === 0) {
        return { success: false, message: "Cart is empty" };
    }

    const validItems = cart.items.filter(item =>
        item.productId &&
        item.variantId &&
        item.productId.isActive &&
        !item.productId.isDeleted &&
        item.variantId.isActive &&
        !item.variantId.isDeleted &&
        item.variantId.stock > 0
    );

    for (const item of validItems) {
        const offerData        = await calculateItemOffer(item.productId, item.variantId, item.quantity);
        item.originalPrice     = offerData.originalPrice;
        item.finalPrice        = offerData.finalPrice;
        item.offerDiscount     = offerData.offerDiscount;
        item.appliedOffer      = offerData.appliedOffer;
        item.badgeLabel        = offerData.badgeLabel;
    }

    let totalItems = 0;
    validItems.forEach(item => { totalItems += item.quantity; });

    const totals = await calculateCheckoutTotals({ cartItems: validItems, userId, couponCode });

    const addresses = await Address.find({ userId })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean();

    const availableCoupons = await Coupon.find({
        isDeleted: false,
        isActive:  true,
        startDate: { $lte: new Date() },
        endDate:   { $gte: new Date() },
    })
        .sort({ createdAt: -1 })
        .lean();

    return {
        success:        true,
        cartItems:      validItems,
        addresses,
        availableCoupons,
        subtotal:       totals.subtotal,
        offerDiscount:  totals.offerDiscount,
        couponDiscount: totals.couponDiscount,
        totalItems,
        taxAmount:      totals.taxAmount,
        deliveryCharge: totals.deliveryCharge,
        finalAmount:    totals.finalAmount,
    };
};

/* =========================================
   SHARED — GENERATE UNIQUE ORDER ID
   FIX: Date.now() + random suffix to prevent
   collisions on simultaneous orders
========================================= */
const generateOrderId = () => {
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `IST${Date.now()}${random}`;
};

/* =========================================
   SHARED — BUILD ORDER ITEMS FROM CART
========================================= */
const buildOrderItems = async (cartItems) => {
    const orderItems = [];

    for (const item of cartItems) {
        const offerData = await calculateItemOffer(item.productId, item.variantId, item.quantity);

        orderItems.push({
            productId:     item.productId._id,
            variantId:     item.variantId._id,
            productName:   item.productId.name,
            productImage:  item.variantId.images?.[0] || item.productId.thumbnail,
            variantName:   [item.variantId.color, item.variantId.storage].filter(Boolean).join(" • "),
            quantity:      item.quantity,
            originalPrice: item.price,
            finalPrice:    offerData.finalPrice,
            offerDiscount: offerData.offerDiscount,
            price:         offerData.finalPrice,
        });
    }

    return orderItems;
};

/* =========================================
   SHARED — STRICT STOCK REVALIDATION
   (pre-check only — does not lock or reserve
   stock. The real guarantee against overselling
   is deductStockAtomically below, which runs
   immediately before Order.create.)
========================================= */
const revalidateStock = (cartItems) => {
    for (const item of cartItems) {
        if (!item.productId || !item.productId.isActive || item.productId.isDeleted) {
            return { valid: false, message: `${item.productId?.name || "Product"} is unavailable` };
        }
        if (!item.variantId || !item.variantId.isActive || item.variantId.isDeleted) {
            return { valid: false, message: `${item.productId.name} variant is unavailable` };
        }
        if (item.variantId.stock <= 0) {
            return { valid: false, message: `${item.productId.name} is out of stock` };
        }
        if (item.quantity > item.variantId.stock) {
            return { valid: false, message: `Only ${item.variantId.stock} units available for ${item.productId.name}` };
        }
    }
    return { valid: true };
};

/* =========================================
   SHARED — ATOMIC STOCK DEDUCTION
   FIX: replaces the old read-then-write pattern
   (`variant.stock -= qty; variant.save()`), which
   is a race condition — two concurrent checkouts
   could both read the same stock value, both pass
   the check, and both decrement, pushing stock
   negative and overselling.

   findOneAndUpdate with a `stock: {$gte: quantity}`
   filter performs the check-and-decrement as a
   single atomic operation at the database level.
   If stock dropped below what's needed between
   revalidateStock() and this call (e.g. another
   order beat this one to it), the filter simply
   won't match and this returns null — that item
   is rolled back and the whole order fails with a
   clear message, rather than silently overselling.

   IMPORTANT: this must run BEFORE Order.create, and
   if any item fails, no order should be created and
   any already-decremented items in this same call
   must be restored (best-effort compensation, since
   Mongoose standalone/non-transactional updates here
   aren't wrapped in a multi-document transaction).
========================================= */
const deductStockAtomically = async (cartItems) => {

    const decremented = [];

    for (const item of cartItems) {

        const updated = await Variant.findOneAndUpdate(
            {
                _id: item.variantId._id,
                stock: { $gte: item.quantity },
            },
            {
                $inc: { stock: -item.quantity },
            },
            { new: true },
        );

        if (!updated) {

            /* ROLL BACK anything already decremented in this
               same checkout attempt before failing */

            for (const done of decremented) {
                await Variant.findByIdAndUpdate(
                    done.variantId,
                    { $inc: { stock: done.quantity } },
                );
            }

            return {
                success: false,
                message: `${item.productId.name} just went out of stock. Please review your cart.`,
            };
        }

        decremented.push({
            variantId: item.variantId._id,
            quantity:  item.quantity,
        });
    }

    return { success: true };
};

/* =========================================
   SHARED — REVALIDATE COUPON AT ORDER TIME
   FIX: coupon validated when applied but
   could expire or hit limit before checkout
========================================= */
const revalidateCoupon = async (couponCode, subtotal, userId) => {
    if (!couponCode) return { valid: true, coupon: null };

    const coupon = await Coupon.findOne({
        code:      couponCode.toUpperCase(),
        isActive:  true,
        isDeleted: false,
    });

    if (!coupon) return { valid: false, message: "Coupon is no longer valid" };

    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
        return { valid: false, message: "Coupon has expired" };
    }

    if (coupon.totalUsageLimit && coupon.usedCount >= coupon.totalUsageLimit) {
        return { valid: false, message: "Coupon usage limit reached" };
    }

    const usageCount = await CouponUsage.countDocuments({ couponId: coupon._id, userId });
    if (usageCount >= coupon.userUsageLimit) {
        return { valid: false, message: "You have already used this coupon" };
    }

    if (subtotal < coupon.minPurchase) {
        return { valid: false, message: `Minimum purchase ₹${coupon.minPurchase} required` };
    }

    return { valid: true, coupon };
};

/* =========================================
   SHARED — RECORD COUPON USAGE
   FIX: increment usedCount + create CouponUsage
   record so per-user limits are enforced
========================================= */
const recordCouponUsage = async (couponId, userId, orderId) => {
    if (!couponId) return;

    await CouponUsage.create({ couponId, userId, orderId });
    await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });
};

/* =========================================
   PLACE ORDER — COD
========================================= */
export const placeOrderCODService = async (
    userId,
    addressId,
    deliveryType = "standard",
    paymentMethod = "COD",
    couponCode = null,
) => {

    const cart = await Cart.findOne({ userId })
        .populate("items.productId")
        .populate("items.variantId");

    if (!cart || cart.items.length === 0) {
        return { success: false, message: "Cart is empty" };
    }

    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) return { success: false, message: "Address not found" };

    const stockCheck = revalidateStock(cart.items);
    if (!stockCheck.valid) return { success: false, message: stockCheck.message };

    const totals = await calculateCheckoutTotals({ cartItems: cart.items, userId, couponCode, deliveryType });

    /* FIX: revalidate coupon at order placement time */
    if (couponCode) {
        const offerDiscountedSubtotal = totals.subtotal - totals.offerDiscount;
        const couponCheck = await revalidateCoupon(couponCode, offerDiscountedSubtotal, userId);
        if (!couponCheck.valid) return { success: false, message: couponCheck.message };
    }

    /* FIX: atomic stock deduction BEFORE order creation —
       guarantees no overselling under concurrent checkouts */
    const stockDeduction = await deductStockAtomically(cart.items);
    if (!stockDeduction.success) {
        return { success: false, message: stockDeduction.message };
    }

    const orderItems = await buildOrderItems(cart.items);

    const order = await Order.create({
        userId,
        orderId:           generateOrderId(),
        items:             orderItems,
        shippingAddress: {
            fullName:     address.fullName,
            phoneNumber:  address.phoneNumber,
            addressLine1: address.addressLine1,
            city:         address.city,
            state:        address.state,
            country:      address.country,
            pincode:      address.pincode,
        },
        paymentMethod,
        paymentStatus:     paymentMethod === "COD" ? "Pending" : "Paid",
        subtotal:          totals.subtotal,
        discountAmount:    totals.offerDiscount + totals.couponDiscount,
        offerDiscount:     totals.offerDiscount,
        couponDiscount:    totals.couponDiscount,
        couponCode:        totals.coupon?.code || null,
        couponId:          totals.coupon?._id  || null,
        taxAmount:         totals.taxAmount,
        deliveryCharge:    totals.deliveryCharge,
        finalAmount:       totals.finalAmount,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    /* FIX: record coupon usage after order created */
    if (totals.coupon) {
        await recordCouponUsage(totals.coupon._id, userId, order._id);
    }

    cart.items = [];
    await cart.save();

    return { success: true, order };
};

/* =========================================
   PLACE ORDER — WALLET
========================================= */
export const placeOrderWalletService = async (
    userId,
    addressId,
    deliveryType = "standard",
    couponCode = null,
) => {

    const cart = await Cart.findOne({ userId })
        .populate("items.productId")
        .populate("items.variantId");

    if (!cart || cart.items.length === 0) {
        return { success: false, message: "Cart is empty" };
    }

    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) return { success: false, message: "Address not found" };

    const stockCheck = revalidateStock(cart.items);
    if (!stockCheck.valid) return { success: false, message: stockCheck.message };

    const totals = await calculateCheckoutTotals({ cartItems: cart.items, userId, couponCode, deliveryType });

    /* FIX: revalidate coupon at order placement */
    if (couponCode) {
        const offerDiscountedSubtotal = totals.subtotal - totals.offerDiscount;
        const couponCheck = await revalidateCoupon(couponCode, offerDiscountedSubtotal, userId);
        if (!couponCheck.valid) return { success: false, message: couponCheck.message };
    }

    /* DEBIT WALLET FIRST — fail fast before touching stock or creating order */
    const walletResponse = await debitWallet({
        userId,
        amount:          totals.finalAmount,
        transactionType: "OrderPayment",
        description:     "Wallet payment for order",
    });

    if (!walletResponse.success) {
        return { success: false, message: "Insufficient wallet balance" };
    }

    /* FIX: atomic stock deduction. If this fails after the wallet
       was already debited, refund the wallet before returning,
       since the user should not be charged for an order that
       can't actually be placed. */
    const stockDeduction = await deductStockAtomically(cart.items);
    if (!stockDeduction.success) {

        const { creditWallet } = await import("../shared/walletService.js");

        await creditWallet({
            userId,
            amount:          totals.finalAmount,
            transactionType: "OrderPaymentRefund",
            description:     "Refund — order could not be placed (stock unavailable)",
        });

        return { success: false, message: stockDeduction.message };
    }

    const orderItems = await buildOrderItems(cart.items);

    const order = await Order.create({
        userId,
        orderId:           generateOrderId(),
        items:             orderItems,
        shippingAddress: {
            fullName:     address.fullName,
            phoneNumber:  address.phoneNumber,
            addressLine1: address.addressLine1,
            city:         address.city,
            state:        address.state,
            country:      address.country,
            pincode:      address.pincode,
        },
        paymentMethod:     "WALLET",
        paymentStatus:     "Paid",
        subtotal:          totals.subtotal,
        discountAmount:    totals.offerDiscount + totals.couponDiscount,
        offerDiscount:     totals.offerDiscount,
        couponDiscount:    totals.couponDiscount,
        couponCode:        totals.coupon?.code || null,
        couponId:          totals.coupon?._id  || null,
        taxAmount:         totals.taxAmount,
        deliveryCharge:    totals.deliveryCharge,
        finalAmount:       totals.finalAmount,
        /* FIX: record how much was paid via wallet */
        walletAmountUsed:  totals.finalAmount,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    /* FIX: record coupon usage */
    if (totals.coupon) {
        await recordCouponUsage(totals.coupon._id, userId, order._id);
    }

    cart.items = [];
    await cart.save();

    return { success: true, order };
};

/* =========================================
   RAZORPAY CHECKOUT
   Stock locked + DB order saved as "Failed"
   before payment opens. Prevents ghost charges.
========================================= */
export const createRazorpayCheckoutService = async (
    userId,
    addressId,
    deliveryType = "standard",
    couponCode = null,
) => {

    const cart = await Cart.findOne({ userId })
        .populate("items.productId")
        .populate("items.variantId");

    if (!cart || cart.items.length === 0) {
        return { success: false, message: "Cart is empty" };
    }

    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) return { success: false, message: "Address not found" };

    const stockCheck = revalidateStock(cart.items);
    if (!stockCheck.valid) return { success: false, message: stockCheck.message };

    const totals = await calculateCheckoutTotals({ cartItems: cart.items, userId, couponCode, deliveryType });

    /* FIX: revalidate coupon at order placement */
    if (couponCode) {
        const offerDiscountedSubtotal = totals.subtotal - totals.offerDiscount;
        const couponCheck = await revalidateCoupon(couponCode, offerDiscountedSubtotal, userId);
        if (!couponCheck.valid) return { success: false, message: couponCheck.message };
    }

    const razorpayResponse = await createRazorpayOrder({ amount: totals.finalAmount });
    if (!razorpayResponse.success) {
        return { success: false, message: "Failed to initiate payment" };
    }

    /* FIX: atomic stock deduction before creating the (Failed)
       order and opening the payment sheet, same protection as
       COD/Wallet. If stock can't be locked, we don't even start
       the payment flow. */
    const stockDeduction = await deductStockAtomically(cart.items);
    if (!stockDeduction.success) {
        return { success: false, message: stockDeduction.message };
    }

    const orderItems = await buildOrderItems(cart.items);

    /* Save order as Failed — updated to Paid after verification */
    const order = await Order.create({
        userId,
        orderId:           generateOrderId(),
        items:             orderItems,
        shippingAddress: {
            fullName:     address.fullName,
            phoneNumber:  address.phoneNumber,
            addressLine1: address.addressLine1,
            city:         address.city,
            state:        address.state,
            country:      address.country,
            pincode:      address.pincode,
        },
        paymentMethod:     "RAZORPAY",
        paymentStatus:     "Failed",
        razorpayOrderId:   razorpayResponse.razorpayOrder.id,
        subtotal:          totals.subtotal,
        discountAmount:    totals.offerDiscount + totals.couponDiscount,
        offerDiscount:     totals.offerDiscount,
        couponDiscount:    totals.couponDiscount,
        couponCode:        totals.coupon?.code || null,
        couponId:          totals.coupon?._id  || null,
        taxAmount:         totals.taxAmount,
        deliveryCharge:    totals.deliveryCharge,
        finalAmount:       totals.finalAmount,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    cart.items = [];
    await cart.save();

    return {
        success:       true,
        razorpayOrder: razorpayResponse.razorpayOrder,
        amount:        totals.finalAmount,
        orderId:       order.orderId,
    };
};

/* =========================================
   VERIFY RAZORPAY PAYMENT
   Finds the existing "Failed" order by
   razorpayOrderId and marks it Paid.
========================================= */
export const verifyRazorpayPaymentService = async ({
    userId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
}) => {

    const isValid = verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
    if (!isValid) return { success: false, message: "Payment verification failed" };

    const order = await Order.findOne({ userId, razorpayOrderId });
    if (!order) return { success: false, message: "Order not found for this payment" };

    order.paymentStatus     = "Paid";
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    order.orderStatus       = "Pending";
    await order.save();

    /* FIX: record coupon usage only after successful payment */
    if (order.couponId) {
        await recordCouponUsage(order.couponId, userId, order._id);
    }

    return { success: true, order };
};

/* =========================================
   RETRY RAZORPAY PAYMENT
========================================= */
export const retryRazorpayPaymentService = async (userId, orderId) => {

    const order = await Order.findOne({ userId, orderId });
    if (!order)                                    return { success: false, message: "Order not found" };
    if (order.paymentStatus === "Paid")            return { success: false, message: "This order is already paid" };
    if (order.paymentMethod !== "RAZORPAY")        return { success: false, message: "This order does not use Razorpay" };

    const razorpayResponse = await createRazorpayOrder({ amount: order.finalAmount });
    if (!razorpayResponse.success) return { success: false, message: "Failed to create payment session" };

    order.razorpayOrderId = razorpayResponse.razorpayOrder.id;
    await order.save();

    return {
        success:       true,
        razorpayOrder: razorpayResponse.razorpayOrder,
        amount:        order.finalAmount,
        orderId:       order.orderId,
    };
};