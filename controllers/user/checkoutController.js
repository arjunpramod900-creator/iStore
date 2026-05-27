import { loadCheckoutService } from "../../services/user/checkoutService.js";

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
