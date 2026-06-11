import {

  getCouponsService,

  createCouponService,

  getCouponByIdService,

  updateCouponService,

  deleteCouponService,

} from "../../services/admin/couponService.js";

/* ============================
   COUPON LIST
============================ */

export const loadCoupons =
async (req, res) => {

  try {

    const coupons =
    await getCouponsService();

    res.render(
      "admin/coupons",
      {
        page: "coupons",
        coupons,
      }
    );

  }

  catch (error) {

    console.log(error);

    res.redirect(
      "/admin/dashboard"
    );

  }

};

/* ============================
   ADD COUPON PAGE
============================ */

export const renderAddCoupon =
(req, res) => {

  res.render(
    "admin/add-coupon",
    {
      page: "coupons",
    }
  );

};

/* ============================
   CREATE COUPON
============================ */

export const addCoupon =
async (req, res) => {

  try {

    await createCouponService(
      req.body
    );

    res.redirect(
      "/admin/coupons"
    );

  }

  catch (error) {

    console.log(error);

    res.send(
      error.message
    );

  }

};

/* ============================
   EDIT PAGE
============================ */

export const renderEditCoupon =
async (req, res) => {

  try {

    const coupon =
    await getCouponByIdService(
      req.params.id
    );

    res.render(
      "admin/edit-coupon",
      {
        page: "coupons",
        coupon,
      }
    );

  }

  catch (error) {

    console.log(error);

    res.redirect(
      "/admin/coupons"
    );

  }

};

/* ============================
   UPDATE COUPON
============================ */

export const updateCoupon =
async (req, res) => {

  try {

    await updateCouponService(

      req.params.id,

      req.body,

    );

    res.redirect(
      "/admin/coupons"
    );

  }

  catch (error) {

    console.log(error);

    res.send(
      error.message
    );

  }

};

/* ============================
   DELETE COUPON
============================ */

export const deleteCoupon =
async (req, res) => {

  try {

    await deleteCouponService(
      req.params.id
    );

    res.json({
      success: true,
    });

  }

  catch (error) {

    console.log(error);

    res.status(400).json({

      success: false,

      message:
        error.message,

    });

  }

};