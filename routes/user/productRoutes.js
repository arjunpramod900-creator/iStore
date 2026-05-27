import express from "express";

const router = express.Router();

import {
  loadAllProducts,
  loadProductDetails,
} from "../../controllers/user/productController.js";

import { addReview } from "../../controllers/user/reviewController.js";

import { isLoggedIn } from "../../middleware/authMiddleware.js";

/* ================================
   ALL PRODUCTS
================================ */

router.get(
  "/products",

  loadAllProducts,
);

/* ================================
   PRODUCT DETAILS
================================ */

router.get(
  "/products/:id",

  loadProductDetails,
);

/* ================================
   PRODUCT REVIEWS
================================ */

router.post(
  "/review/add",

  isLoggedIn,

  addReview,
);

export default router;
