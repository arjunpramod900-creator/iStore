import express from "express";

const router = express.Router();

import {
  loadAllProducts,
  loadProductDetails,
  liveSearchProducts,
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
   LIVE SEARCH API
================================ */

router.get(
  "/api/search",

  liveSearchProducts,
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
