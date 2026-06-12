import express from "express";

const router = express.Router();

import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js";

import {

  loadCoupons,

  addCoupon,

  updateCoupon,

  deleteCoupon,

} from "../../controllers/admin/adminCouponController.js";

/* ============================
   COUPON LIST
============================ */

router.get(

  "/coupons",

  adminAuthMiddleware,

  loadCoupons,

);

/* ============================
   ADD COUPON
============================ */

router.post(

  "/coupons/add",

  adminAuthMiddleware,

  addCoupon,

);

/* ============================
   UPDATE COUPON
============================ */

router.post(

  "/coupons/edit/:id",

  adminAuthMiddleware,

  updateCoupon,

);

/* ============================
   DELETE COUPON
============================ */

router.patch(

  "/coupons/delete/:id",

  adminAuthMiddleware,

  deleteCoupon,

);

export default router;