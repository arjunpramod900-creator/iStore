import express from "express";

import { isLoggedIn } from "../../middleware/authMiddleware.js";

import userBlockCheckMiddleware from "../../middleware/userBlockCheckMiddleware.js";

import {
  loadCheckoutPage,
  placeOrder,
  verifyRazorpayPayment,
  loadOrderSuccessPage,
  applyCoupon,
  removeCoupon,
} from "../../controllers/user/checkoutController.js";

const router = express.Router();

/* =========================================
   LOAD CHECKOUT
========================================= */

router.get(
  "/checkout",

  isLoggedIn,

  userBlockCheckMiddleware,

  loadCheckoutPage,
);


/* =========================================
   APPLY COUPON
========================================= */

router.post(

  "/checkout/apply-coupon",

  isLoggedIn,

  userBlockCheckMiddleware,

  applyCoupon,

);

/* =========================================
   REMOVE COUPON
========================================= */

router.post(

  "/checkout/remove-coupon",

  isLoggedIn,

  userBlockCheckMiddleware,

  removeCoupon,

);

/* =========================================
   PLACE ORDER (COD)
========================================= */

router.post(
  
  "/checkout/place-order",

  isLoggedIn,

  userBlockCheckMiddleware,

  placeOrder,
);

/* =========================================
   VERIFY RAZORPAY PAYMENT
========================================= */

router.post(

  "/checkout/verify-payment",

  isLoggedIn,

  userBlockCheckMiddleware,

  verifyRazorpayPayment,

);

/* =========================================
   ORDER SUCCESS
========================================= */

router.get(

  "/order-success/:orderId",

  isLoggedIn,

  userBlockCheckMiddleware,

  loadOrderSuccessPage,
);

export default router;
