import {

  getCouponsService,

  createCouponService,

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
   CREATE COUPON
============================ */

export const addCoupon =
async (req, res) => {

  try {

    await createCouponService(
      req.body
    );

    return res.json({

      success: true,

    });

  }

  catch (error) {

    console.log(error);

    return res.status(400).json({

      success: false,

      message:
      error.message,

    });

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

    return res.json({

      success: true,

    });

  }

  catch (error) {

    console.log(error);

    return res.status(400).json({

      success: false,

      message:
      error.message,

    });

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

    return res.json({

      success: true,

    });

  }

  catch (error) {

    console.log(error);

    return res.status(400).json({

      success: false,

      message:
      error.message,

    });

  }

};