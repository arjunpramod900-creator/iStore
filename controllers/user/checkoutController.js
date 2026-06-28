import {
  loadCheckoutService,
  placeOrderCODService,
  placeOrderWalletService,
  createRazorpayCheckoutService,
  verifyRazorpayPaymentService,
  loadRetryCheckoutService,
  markPaymentFailedService,
  applyRetryCouponService,
} from "../../services/user/checkoutService.js";

import { calculateCheckoutTotals } from "../../services/shared/pricingService.js";

import Cart  from "../../models/Cart.js";
import Order from "../../models/Order.js";

/* =========================================
   LOAD CHECKOUT PAGE  (mode = "new")
========================================= */

export const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.userId;

    const response = await loadCheckoutService(
      userId,
      req.session.appliedCoupon?.code || null,
    );

    if (!response.success) {
      return res.redirect("/cart");
    }

    res.render("user/checkout", {
      page:             "checkout",
      mode:             "new",          /* ← tells the template which UI to show */
      cart: {
        items:    response.cartItems,
        subtotal: response.subtotal,
      },
      order:            null,           /* not used in new mode */
      addresses:        response.addresses,
      availableCoupons: response.availableCoupons,
      subtotal:         response.subtotal,
      offerDiscount:    response.offerDiscount,
      couponDiscount:   response.couponDiscount,
      appliedCoupon:    req.session.appliedCoupon || null,
      totalItems:       response.totalItems,
      taxAmount:        response.taxAmount,
      deliveryCharge:   response.deliveryCharge,
      finalAmount:      response.finalAmount,
      razorpayKey:      process.env.RAZORPAY_KEY_ID,
      stockMessages:    response.stockMessages || [],
    });

  } catch (error) {
    console.log("Load Checkout Error:", error);
    return res.redirect("/cart");
  }
};


/* =========================================
   LOAD RETRY CHECKOUT PAGE  (mode = "retry")
   Renders the same checkout.ejs but with
   order data instead of cart data.
   Route: GET /orders/:orderId/retry
========================================= */

export const loadRetryCheckoutPage = async (req, res) => {
  try {
    const userId      = req.session.userId;
    const { orderId } = req.params;

    const response = await loadRetryCheckoutService(userId, orderId);

    if (!response.success) {
      /* Expired or ineligible — redirect to orders with error message */
      const msg = encodeURIComponent(response.message);
      return res.redirect(`/orders?retryError=${msg}`);
    }

    const order = response.order;

    // Restore any new coupon applied in this session, otherwise fallback to the order's existing coupon
    const appliedCoupon   = req.session.retryCoupon || null;
    const couponDiscount  = appliedCoupon ? appliedCoupon.discount : (order.couponDiscount || 0);

    // Recalculate totals (order.subtotal is already post-offer discount)
    const base            = order.subtotal || 0;
    const discounted      = base - couponDiscount;
    const deliveryCharge  = order.deliveryCharge ?? (discounted >= 5000 ? 0 : 99);
    const taxAmount       = Math.floor(discounted * 0.02);
    const grandTotal      = discounted + deliveryCharge + taxAmount;

    res.render("user/checkout", {
      page:             "orders",
      mode:             "retry",
      cart:             null,
      order,
      addresses:        response.addresses,
      availableCoupons: response.availableCoupons,
      subtotal:         order.subtotal,
      offerDiscount:    order.offerDiscount  || 0,
      couponDiscount,
      appliedCoupon,
      totalItems:       order.items?.length || 0,
      taxAmount,
      deliveryCharge,
      finalAmount:      grandTotal,
      razorpayKey:      process.env.RAZORPAY_KEY_ID,
    });

  } catch (error) {
    console.log("Load Retry Checkout Error:", error);
    return res.redirect("/orders");
  }
};


/* =========================================
   PLACE ORDER  (new mode)
========================================= */

export const placeOrder = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { addressId, deliveryType, paymentMethod } = req.body;

    /* ── RAZORPAY ── */
    if (paymentMethod === "RAZORPAY") {
      const response = await createRazorpayCheckoutService(
        userId,
        addressId,
        deliveryType,
        req.session.appliedCoupon?.code || null,
      );

      if (!response.success) {
        return res.status(400).json({ success: false, message: response.message });
      }

      delete req.session.appliedCoupon;

      return res.json({
        success:       true,
        paymentMethod: "RAZORPAY",
        razorpayOrder: response.razorpayOrder,
        amount:        response.amount,
        orderId:       response.orderId,
      });
    }

    /* ── WALLET ── */
    let response;
    if (paymentMethod === "WALLET") {
      response = await placeOrderWalletService(
        userId,
        addressId,
        deliveryType,
        req.session.appliedCoupon?.code || null,
      );
    }

    /* ── COD ── */
    else {
      response = await placeOrderCODService(
        userId,
        addressId,
        deliveryType,
        "COD",
        req.session.appliedCoupon?.code || null,
      );
    }

    if (!response.success) {
      return res.status(400).json({ success: false, message: response.message });
    }

    delete req.session.appliedCoupon;

    return res.status(200).json({
      success:     true,
      redirectUrl: `/order-success/${response.order.orderId}`,
    });

  } catch (error) {
    console.log("Place Order Error:", error);
    return res.status(500).json({ success: false, message: "Order placement failed" });
  }
};


/* =========================================
   VERIFY RAZORPAY PAYMENT
   Shared by both new checkout and retry flow.
   Finds the order by razorpayOrderId so it
   works regardless of which flow created it.
========================================= */

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const response = await verifyRazorpayPaymentService({
      userId:            req.session.userId,
      razorpayOrderId:   req.body.razorpay_order_id,
      razorpayPaymentId: req.body.razorpay_payment_id,
      razorpaySignature: req.body.razorpay_signature,
    });

    if (!response.success) {
      return res.json({ success: false, message: response.message });
    }

    return res.json({
      success:     true,
      redirectUrl: `/order-success/${response.order.orderId}`,
    });

  } catch (error) {
    console.log("Verify Payment Error:", error);
    return res.json({ success: false, message: "Payment verification failed" });
  }
};


/* =========================================
   APPLY COUPON
========================================= */

export const applyCoupon = async (req, res) => {
  try {
    const userId         = req.session.userId;
    const { couponCode } = req.body;

    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .populate("items.variantId")
      .lean();

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    const totals = await calculateCheckoutTotals({ cartItems: cart.items, couponCode, userId });

    if (!totals.coupon) {
      return res.json({ success: false, message: totals.couponError || "Invalid coupon" });
    }

    req.session.appliedCoupon = {
      code:     totals.coupon.code,
      discount: totals.couponDiscount,
    };

    return res.json({
      success:        true,
      couponCode:     totals.coupon.code,
      couponDiscount: totals.couponDiscount,
      finalAmount:    totals.finalAmount,
      taxAmount:      totals.taxAmount,
      deliveryCharge: totals.deliveryCharge,
    });

  } catch (error) {
    console.log("Apply Coupon Error:", error);
    return res.json({ success: false, message: "Failed to apply coupon" });
  }
};


/* =========================================
   REMOVE COUPON
========================================= */

export const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.userId;
    delete req.session.appliedCoupon;

    const cart = await Cart.findOne({ userId })
      .populate("items.productId")
      .populate("items.variantId")
      .lean();

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: "Cart is empty" });
    }

    const totals = await calculateCheckoutTotals({ cartItems: cart.items, userId, couponCode: null });

    return res.json({
      success:        true,
      taxAmount:      totals.taxAmount,
      deliveryCharge: totals.deliveryCharge,
      finalAmount:    totals.finalAmount,
    });

  } catch (error) {
    console.log("Remove Coupon Error:", error);
    return res.json({ success: false, message: "Failed to remove coupon" });
  }
};


/* =========================================
   LOAD ORDER SUCCESS PAGE
========================================= */

export const loadOrderSuccessPage = async (req, res) => {
  try {
    const order = await Order.findOne({
      orderId: req.params.orderId,
      userId:  req.session.userId,
    });

    if (!order) return res.redirect("/");

    res.render("user/order-success", { page: "order-success", order });

  } catch (error) {
    console.log("Load Success Page Error:", error);
    return res.redirect("/");
  }
};

/* =========================================
   LOAD ORDER FAILURE PAGE
========================================= */

export const loadOrderFailurePage = async (req, res) => {

  try {

    const order = await Order.findOne({
      orderId: req.params.orderId,
      userId: req.session.userId,
    });

    if (!order) {
      return res.redirect("/orders");
    }

/* Paid orders should not show failure page */
if (order.paymentStatus === "Paid") {
  return res.redirect(`/orders/${order.orderId}`);
}

    res.render("user/order-failure", {
      page: "order-failure",
      order,
    });

  } catch (error) {

    console.log("Load Failure Page Error:", error);

    return res.redirect("/orders");

  }

};

export const markPaymentFailed = async (req, res) => {

    try {

        await markPaymentFailedService(
            req.session.userId,
            req.body.orderId
        );

        res.json({
            success: true
        });

    } catch (error) {

        console.log("Mark Payment Failed Error:", error);

        res.status(500).json({
            success: false
        });

    }

};

/* =========================================
   APPLY COUPON — retry mode
   Uses the order's subtotal, not the cart.
========================================= */
export const applyRetryCoupon = async (req, res) => {
  try {
    const userId         = req.session.userId;
    const { orderId }    = req.params;
    const { couponCode } = req.body;

    const result = await applyRetryCouponService(userId, orderId, couponCode);

    if (!result.success) {
      return res.json({ success: false, message: result.message });
    }

    // Store in session so the page reload restores it
    req.session.retryCoupon = {
      code:     result.couponCode,
      discount: result.couponDiscount,
    };

    return res.json({
      success:        true,
      couponCode:     result.couponCode,
      couponDiscount: result.couponDiscount,
      taxAmount:      result.taxAmount,
      deliveryCharge: result.deliveryCharge,
      finalAmount:    result.finalAmount,
    });

  } catch (error) {
    console.log("Apply Retry Coupon Error:", error);
    return res.json({ success: false, message: "Failed to apply coupon" });
  }
};

/* =========================================
   REMOVE COUPON — retry mode
========================================= */
export const removeRetryCoupon = async (req, res) => {
  try {
    // Set code: false to explicitly indicate removal instead of just deleting
    req.session.retryCoupon = { code: false, discount: 0 };

    const userId  = req.session.userId;
    const orderId = req.params.orderId;
    const Order   = (await import("../../models/Order.js")).default;
    const order   = await Order.findOne({ userId, orderId }).lean();
    if (!order) return res.json({ success: false, message: "Order not found" });

    // order.subtotal already has the offer discount applied
    const base           = order.subtotal || 0;
    const deliveryCharge = order.deliveryCharge ?? (base >= 5000 ? 0 : 99);
    const taxAmount      = Math.floor(base * 0.02);
    const finalAmount    = base + deliveryCharge + taxAmount;

    return res.json({ success: true, taxAmount, deliveryCharge, finalAmount });

  } catch (error) {
    console.log("Remove Retry Coupon Error:", error);
    return res.json({ success: false, message: "Failed to remove coupon" });
  }
};