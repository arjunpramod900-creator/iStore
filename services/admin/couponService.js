import Coupon from "../../models/Coupon.js";

/* ============================
   GET ALL COUPONS
============================ */

export const getCouponsService =
async () => {

const coupons =
await Coupon.find({

  isDeleted: false,

})

    .sort({
      createdAt: -1,
    })

    .lean();

  return coupons;

};

/* ============================
   CREATE COUPON
============================ */

export const createCouponService =
async (couponData) => {

  const existingCoupon =
  await Coupon.findOne({

    code:
      couponData.code
      .toUpperCase(),

  });

  if (existingCoupon) {

    throw new Error(
      "Coupon code already exists"
    );

  }

  if (

    new Date(
      couponData.endDate
    )

    <=

    new Date(
      couponData.startDate
    )

  ) {

    throw new Error(
      "End date must be after start date"
    );

  }

  const coupon =
  await Coupon.create({

    ...couponData,

    code:
      couponData.code
      .toUpperCase(),

  });

  return coupon;

};

/* ============================
   GET SINGLE COUPON
============================ */

export const getCouponByIdService =
async (couponId) => {

  const coupon =
  await Coupon.findById(
    couponId
  );

  if (!coupon) {

    throw new Error(
      "Coupon not found"
    );

  }

  return coupon;

};

/* ============================
   UPDATE COUPON
============================ */

export const updateCouponService =
async (
  couponId,
  couponData,
) => {

  const coupon =
  await Coupon.findById(
    couponId
  );

  if (!coupon) {

    throw new Error(
      "Coupon not found"
    );

  }

  if (

    new Date(
      couponData.endDate
    )

    <=

    new Date(
      couponData.startDate
    )

  ) {

    throw new Error(
      "End date must be after start date"
    );

  }

  coupon.title =
    couponData.title;

  coupon.description =
    couponData.description;

  coupon.discountType =
    couponData.discountType;

  coupon.discountValue =
    couponData.discountValue;

  coupon.maxDiscount =
    couponData.maxDiscount;

  coupon.minPurchase =
    couponData.minPurchase;

  coupon.totalUsageLimit =
    couponData.totalUsageLimit;

  coupon.userUsageLimit =
    couponData.userUsageLimit;

  coupon.startDate =
    couponData.startDate;

  coupon.endDate =
    couponData.endDate;

  coupon.isActive =
    couponData.isActive;

  await coupon.save();

  return coupon;

};

/* ============================
   DELETE COUPON
============================ */

export const deleteCouponService =
async (couponId) => {

  const coupon =
  await Coupon.findById(
    couponId
  );

  if (!coupon) {

    throw new Error(
      "Coupon not found"
    );

  }

  coupon.isDeleted = true;

  await coupon.save();

};