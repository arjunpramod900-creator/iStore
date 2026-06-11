import express from "express";

const router = express.Router();

import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js";

import {

  loadCoupons,

  renderAddCoupon,

  addCoupon,

  renderEditCoupon,

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

router.get(

  "/coupons/add",

  adminAuthMiddleware,

  renderAddCoupon,

);

router.post(

  "/coupons/add",

  adminAuthMiddleware,

  addCoupon,

);

/* ============================
   EDIT COUPON
============================ */

router.get(

  "/coupons/edit/:id",

  adminAuthMiddleware,

  renderEditCoupon,

);

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