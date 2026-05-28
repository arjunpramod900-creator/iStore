import {
  loadCheckoutService,
  placeOrderCODService,
} from "../../services/user/checkoutService.js";

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

    const response = await loadCheckoutService(userId);

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

    const { addressId } = req.body;

    const response =
      await placeOrderCODService(
        userId,
        addressId,
      );

    if (!response.success) {
      return res.status(400).json({
        success: false,
        message: response.message,
      });
    }

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
