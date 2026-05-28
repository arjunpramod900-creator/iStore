import express from "express";

import { isLoggedIn } from "../../middleware/authMiddleware.js";

import userBlockCheckMiddleware from "../../middleware/userBlockCheckMiddleware.js";

import {
  loadCheckoutPage,
  placeOrderCOD,
  loadOrderSuccessPage,
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
   PLACE ORDER (COD)
========================================= */

router.post(
  "/checkout/place-order",

  isLoggedIn,

  userBlockCheckMiddleware,

  placeOrderCOD,
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
