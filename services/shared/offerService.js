import Offer from "../../models/Offer.js";

/* =========================================
   CALCULATE BEST OFFER FOR ITEM
========================================= */

export const calculateItemOffer =
async (
  product,
  variant,
  quantity = 1,
) => {

  const now = new Date();

  /* =========================================
     PRODUCT OFFER
  ========================================= */

  const productOffer =
  await Offer.findOne({

    applyTo: "PRODUCT",

    targetId: product._id,

    isActive: true,

    isDeleted: false,

    startDate: {
      $lte: now,
    },

    endDate: {
      $gte: now,
    },

  }).lean();

  /* =========================================
     CATEGORY OFFER
  ========================================= */

  const categoryOffer =
  await Offer.findOne({

    applyTo: "CATEGORY",

    targetId: product.categoryId,

    isActive: true,

    isDeleted: false,

    startDate: {
      $lte: now,
    },

    endDate: {
      $gte: now,
    },

  }).lean();

  let productDiscount = 0;

  let categoryDiscount = 0;

  /* =========================================
     PRODUCT OFFER DISCOUNT
  ========================================= */

  if (productOffer) {

    productDiscount =
    (
      variant.price *
      productOffer.discountValue
    ) / 100;

    if (
      productOffer.maxDiscount > 0
    ) {

      productDiscount =
      Math.min(
        productDiscount,
        productOffer.maxDiscount
      );

    }

  }

  /* =========================================
     CATEGORY OFFER DISCOUNT
  ========================================= */

  if (categoryOffer) {

    categoryDiscount =
    (
      variant.price *
      categoryOffer.discountValue
    ) / 100;

    if (
      categoryOffer.maxDiscount > 0
    ) {

      categoryDiscount =
      Math.min(
        categoryDiscount,
        categoryOffer.maxDiscount
      );

    }

  }

  /* =========================================
     BEST OFFER WINS
  ========================================= */

  const bestDiscount =
  Math.max(
    productDiscount,
    categoryDiscount
  );

  const offerType =
  productDiscount >= categoryDiscount
    ? "PRODUCT"
    : "CATEGORY";

  /* =========================================
     APPLIED OFFER
  ========================================= */

  let appliedOffer = null;

  if (bestDiscount > 0) {

    appliedOffer =
    productDiscount >= categoryDiscount
      ? productOffer
      : categoryOffer;

  }

  /* =========================================
     FINAL PRICE
  ========================================= */

  const finalPrice =
  Math.max(
    0,
    variant.price - bestDiscount
  );

  /* =========================================
     RETURN
  ========================================= */

  return {

    originalPrice:
      variant.price,

    offerDiscount:
      bestDiscount * quantity,

    finalPrice,

    offerType,

    appliedOffer,

  };

};