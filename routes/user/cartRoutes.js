import express from "express";

const router = express.Router();

import { isLoggedIn } from "../../middleware/authMiddleware.js";

import userBlockCheckMiddleware from "../../middleware/userBlockCheckMiddleware.js";

import {
  addToCart,
  loadCart,
  updateCartQuantity,
  removeCartItem,
  clearCart,
  checkCartValidity,
} from "../../controllers/user/cartController.js";

/* =========================================
   PROTECTED CART ROUTES
========================================= */

router.use(
  isLoggedIn,

  userBlockCheckMiddleware,
);

/* =========================================
   LOAD CART PAGE
========================================= */

router.get(
  "/",

  loadCart,
);

/* =========================================
   ADD TO CART
========================================= */

router.post(
  "/add",

  addToCart,
);

/* =========================================
   UPDATE QUANTITY
========================================= */

router.post("/update-quantity", updateCartQuantity);

/* =========================================
   CLEAR CART
========================================= */

router.delete("/clear", clearCart);

/* =========================================
   REMOVE ITEM
========================================= */

router.delete(
  "/remove-item/:variantId",

  removeCartItem,
);

/* =========================================
   CHECK CART VALIDITY (pre-checkout)
========================================= */

router.get(
  "/check-validity",

  checkCartValidity,
);

export default router;
