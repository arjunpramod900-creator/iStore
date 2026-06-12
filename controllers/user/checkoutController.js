import {
  loadCheckoutService,
  placeOrderCODService,
  placeOrderWalletService,
  createRazorpayCheckoutService,
  verifyRazorpayPaymentService,
} from "../../services/user/checkoutService.js";

import {
  calculateCheckoutTotals,
} from "../../services/shared/pricingService.js";

import Cart from "../../models/Cart.js";

import Order from "../../models/Order.js";

/* =========================================
   LOAD CHECKOUT PAGE
========================================= */

export const loadCheckoutPage = async (
  req,

  res,
) => {
  try {
    const userId = req.session.userId;

    const response = await loadCheckoutService(

      userId,

      req.session.appliedCoupon?.code ||

      null,

    );

    /* EMPTY CART */

    if (!response.success) {
      return res.redirect("/cart");
    }

    res.render(
      "user/checkout",
      {
          page: "checkout",

          cart: {
            items: response.cartItems,
            subtotal: response.subtotal,
          },

          addresses: response.addresses,

          availableCoupons: response.availableCoupons,

          subtotal: response.subtotal,

          offerDiscount: response.offerDiscount,

          couponDiscount: response.couponDiscount,

          appliedCoupon: req.session.appliedCoupon || null,

          totalItems: response.totalItems,

          taxAmount: response.taxAmount,

          deliveryCharge: response.deliveryCharge,

          finalAmount: response.finalAmount,

          razorpayKey:
          process.env.RAZORPAY_KEY_ID,
      },
    );
  } catch (error) {
    console.log(
      "Load Checkout Error:",

      error,
    );

    return res.redirect("/cart");
  }
};

/* =========================================
   PLACE ORDER
========================================= */

export const placeOrder = async (
  req,
  res,
) => {

  try {

    const userId =
      req.session.userId;

    const {
      addressId,
      deliveryType,
      paymentMethod,
    } = req.body;

    let response;

    if (
      paymentMethod === "RAZORPAY"
    ) {

response =
await createRazorpayCheckoutService(
  userId,
  addressId,
  deliveryType,
  req.session.appliedCoupon?.code || null,
);

if (!response.success) {

  return res.status(400).json({

    success: false,

    message: response.message,

  });

}

return res.json({

  success: true,

  paymentMethod: "RAZORPAY",

  razorpayOrder:
    response.razorpayOrder,

  amount:
    response.amount,

});

    }

if (
  paymentMethod === "WALLET"
) {

  response =
  await placeOrderWalletService(

    userId,

    addressId,

    deliveryType,

    req.session.appliedCoupon?.code || null,

  );

}

else {

  response =
  await placeOrderCODService(

    userId,

    addressId,

    deliveryType,

    "COD",

    req.session.appliedCoupon?.code || null,

  );

}

    if (!response.success) {

      return res.status(400).json({

        success: false,

        message:
          response.message,

      });

    }

    delete req.session.appliedCoupon;

    return res.status(200).json({

      success: true,

      redirectUrl:
      `/order-success/${response.order.orderId}`,

    });

  }

  catch (error) {

    console.log(
      "Place Order Error:",
      error,
    );

    return res.status(500).json({

      success: false,

      message:
      "Order placement failed",

    });

  }

};

/* =========================================
   VERIFY RAZORPAY PAYMENT
========================================= */

export const verifyRazorpayPayment =
async (req,res) => {

  try {

    const response =
    await verifyRazorpayPaymentService({

      userId:
      req.session.userId,

      addressId:
      req.body.addressId,

      deliveryType:
      req.body.deliveryType,

      couponCode:
      req.session.appliedCoupon?.code
      || null,

      razorpayOrderId:
      req.body.razorpay_order_id,

      razorpayPaymentId:
      req.body.razorpay_payment_id,

      razorpaySignature:
      req.body.razorpay_signature,

    });

    if (!response.success) {

      return res.json({

        success:false,

        message:
        response.message,

      });

    }

    delete req.session.appliedCoupon;

    return res.json({

      success:true,

      redirectUrl:
      `/order-success/${response.order.orderId}`,

    });

  }

  catch(error){

    console.log(error);

    return res.json({

      success:false,

      message:
      "Payment verification failed",

    });

  }

};

/* =========================================
   APPLY COUPON
========================================= */

export const applyCoupon =
async (
  req,
  res,
) => {

  try {

    const userId =
    req.session.userId;

    const {
      couponCode,
    } = req.body;

    const cart =
    await Cart.findOne({
      userId,
    })
    .populate("items.productId")
    .populate("items.variantId")
    .lean();

    if (
      !cart ||
      cart.items.length === 0
    ) {

      return res.json({

        success: false,

        message:
        "Cart is empty",

      });

    }

    const totals =
    await calculateCheckoutTotals({

      cartItems:
      cart.items,

      couponCode,

      userId,

    });

    if (
      !totals.coupon
    ) {

      return res.json({

        success: false,

        message:
        "Invalid coupon",

      });

    }

    req.session.appliedCoupon = {

      code:
      totals.coupon.code,

      discount:
      totals.couponDiscount,

    };

    return res.json({

      success: true,

      couponCode:
      totals.coupon.code,

      couponDiscount:
      totals.couponDiscount,

      finalAmount:
      totals.finalAmount,

      taxAmount:
      totals.taxAmount,

      deliveryCharge:
      totals.deliveryCharge,

    });

  }

  catch (error) {

    console.log(
      "Apply Coupon Error:",
      error,
    );

    return res.json({

      success: false,

      message:
      "Failed to apply coupon",

    });

  }

};

/* =========================================
   REMOVE COUPON
========================================= */

export const removeCoupon =
async (
  req,
  res,
) => {

  try {

    const userId =
    req.session.userId;

    delete req.session.appliedCoupon;

    const cart =
    await Cart.findOne({
      userId,
    })
    .populate("items.productId")
    .populate("items.variantId")
    .lean();

    if (!cart || cart.items.length === 0) {

  return res.json({

    success: false,

    message: "Cart is empty",

  });

}

const totals =
await calculateCheckoutTotals({

      cartItems:
      cart.items,

      userId,

      couponCode: null,

    });

    return res.json({

      success: true,

      taxAmount:
      totals.taxAmount,

      deliveryCharge:
      totals.deliveryCharge,

      finalAmount:
      totals.finalAmount,

    });

  }

  catch (error) {

    console.log(
      "Remove Coupon Error:",
      error,
    );

    return res.json({

      success: false,

      message:
      "Failed to remove coupon",

    });

  }

};
/* =========================================
   LOAD ORDER SUCCESS PAGE
========================================= */

export const loadOrderSuccessPage =
async (
  req,
  res,
) => {
  try {
    const order = await Order.findOne({

        orderId: req.params.orderId,

        userId: req.session.userId,

        });

    if (!order) {
      return res.redirect("/");
    }

    res.render(
      "user/order-success",
      {
        page: "order-success",
        order,
      },
    );
  } catch (error) {
    console.log(
      "Load Success Page Error:",
      error,
    );

    return res.redirect("/");
  }
};
