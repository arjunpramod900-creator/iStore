import {
  loadCheckoutService,
  placeOrderCODService,
} from "../../services/user/checkoutService.js";

import {
  validateCoupon,
} from "../../services/user/couponService.js";

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

        subtotal: response.subtotal,

        offerDiscount: response.offerDiscount,

        couponDiscount: response.couponDiscount,

        appliedCoupon: req.session.appliedCoupon || null,

        totalItems: response.totalItems,

        taxAmount: response.taxAmount,

        deliveryCharge: response.deliveryCharge,

        finalAmount: response.finalAmount,
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
   PLACE ORDER COD
========================================= */

export const placeOrderCOD = async (
  req,
  res,
) => {
  try {
    const userId = req.session.userId;

    const {addressId,deliveryType,} = req.body;

   const response =
    await placeOrderCODService(
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

/* CLEAR APPLIED COUPON AFTER SUCCESSFUL ORDER */

delete req.session.appliedCoupon;

return res.status(200).json({
  success: true,

  redirectUrl:
    `/order-success/${response.order.orderId}`,
});
  } catch (error) {
    console.log(
      "Place Order COD Error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Order placement failed",
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
