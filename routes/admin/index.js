import express from "express";

import adminAuthRoutes from "./adminAuthRoutes.js";
import adminRoutes from "./adminRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
import adminSalesRoutes from "./adminSalesRoutes.js";
import couponRoutes from "./adminCouponRoutes.js";
import offerRoutes from "./adminOfferRoutes.js";

import adminNoCache from "../../middleware/adminNoCache.js";

const router = express.Router();

/* Authentication */
router.use(adminNoCache, adminAuthRoutes);

/* Dashboard + Users + Products + Orders */
router.use(adminNoCache, adminRoutes);

/* Categories */
router.use(categoryRoutes);

/* Sales */
router.use(adminSalesRoutes);

/* Coupons */
router.use(couponRoutes);

/* Offers */
router.use(offerRoutes);

export default router;