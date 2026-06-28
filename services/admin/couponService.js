import Coupon from "../../models/Coupon.js";

/* ============================
   GET ALL COUPONS
============================ */

export const getCouponsService =
async () => {

  return await Coupon.find({

    isDeleted: false,

  })

  .sort({

    createdAt: -1,

  })

  .lean();

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

  if (

    couponData.discountType ===
    "PERCENTAGE"

    &&

    Number(
      couponData.discountValue
    ) > 90

  ) {

    throw new Error(
      "Percentage discount cannot exceed 90%"
    );

  }

  if (
    Number(couponData.discountValue) < 0 ||
    Number(couponData.minPurchase) < 0 ||
    Number(couponData.maxDiscount) < 0
  ) {
    throw new Error("Invalid coupon values");
  }

  if (
    couponData.discountType === "FIXED" &&
    Number(couponData.discountValue) > Number(couponData.minPurchase)
  ) {
    throw new Error("Fixed discount value cannot exceed the minimum purchase amount");
  }

  const totalLimit = Number(couponData.totalUsageLimit) || 0;
  const userLimit = Number(couponData.userUsageLimit) || 1;

  if (userLimit < 1) {
    throw new Error("Limit per user must be at least 1");
  }

  if (totalLimit > 0 && userLimit > totalLimit) {
    throw new Error(`Limit per user (${userLimit}) cannot exceed total usage limit (${totalLimit})`);
  }

  return await Coupon.create({

    title:
    couponData.title,

    code:
    couponData.code
    .toUpperCase(),

    description:
    couponData.description,

    discountType:
    couponData.discountType,

    discountValue:
    Number(
      couponData.discountValue
    ),

    maxDiscount:
    Number(
      couponData.maxDiscount
    ) || 0,

    minPurchase:
    Number(
      couponData.minPurchase
    ) || 0,

    totalUsageLimit:
    Number(
      couponData.totalUsageLimit
    ) || 0,

    userUsageLimit:
    Number(
      couponData.userUsageLimit
    ) || 1,

    startDate:
    couponData.startDate,

    endDate:
    couponData.endDate,

    isActive:
    couponData.isActive ===
    "true",

  });

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

  const existingCoupon =
  await Coupon.findOne({

    code:
    couponData.code
    .toUpperCase(),

    _id: {

      $ne:
      couponId,

    },

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

  if (
    couponData.discountType === "PERCENTAGE" &&
    Number(couponData.discountValue) > 90
  ) {
    throw new Error("Percentage discount cannot exceed 90%");
  }

  if (
    Number(couponData.discountValue) < 0 ||
    Number(couponData.minPurchase) < 0 ||
    Number(couponData.maxDiscount) < 0
  ) {
    throw new Error("Invalid coupon values");
  }

  if (
    couponData.discountType === "FIXED" &&
    Number(couponData.discountValue) > Number(couponData.minPurchase)
  ) {
    throw new Error("Fixed discount value cannot exceed the minimum purchase amount");
  }

  const totalLimit = Number(couponData.totalUsageLimit) || 0;
  const userLimit = Number(couponData.userUsageLimit) || 1;

  if (userLimit < 1) {
    throw new Error("Limit per user must be at least 1");
  }

  if (totalLimit > 0 && userLimit > totalLimit) {
    throw new Error(`Limit per user (${userLimit}) cannot exceed total usage limit (${totalLimit})`);
  }

  coupon.code =
  couponData.code
  .toUpperCase();

  coupon.title =
  couponData.title;

  coupon.description =
  couponData.description;

  coupon.discountType =
  couponData.discountType;

  coupon.discountValue =
  Number(
    couponData.discountValue
  );

  coupon.maxDiscount =
  Number(
    couponData.maxDiscount
  ) || 0;

  coupon.minPurchase =
  Number(
    couponData.minPurchase
  ) || 0;

  coupon.totalUsageLimit =
  Number(
    couponData.totalUsageLimit
  ) || 0;

  coupon.userUsageLimit =
  Number(
    couponData.userUsageLimit
  ) || 1;

  coupon.startDate =
  couponData.startDate;

  coupon.endDate =
  couponData.endDate;

  coupon.isActive =
  couponData.isActive ===
  "true";

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