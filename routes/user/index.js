import express from "express";

import homeRoutes from "./homeRoutes.js";
import authRoutes from "./authRoutes.js";
import profileRoutes from "./profileRoutes.js";
import productRoutes from "./productRoutes.js";
import cartRoutes from "./cartRoutes.js";
import wishlistRoutes from "./wishlistRoutes.js";
import checkoutRoutes from "./checkoutRoutes.js";
import orderRoutes from "./orderRoutes.js";
import walletRoutes from "./walletRoutes.js";

const router = express.Router();

/* Home */
router.use("/", homeRoutes);

/* Authentication */
router.use("/", authRoutes);

/* Profile */
router.use("/", profileRoutes);

/* Products */
router.use("/", productRoutes);

/* Cart */
router.use("/cart", cartRoutes);

/* Wishlist */
router.use("/wishlist", wishlistRoutes);

/* Checkout */
router.use("/", checkoutRoutes);

/* Orders */
router.use("/", orderRoutes);

/* Wallet */
router.use("/", walletRoutes);

export default router;