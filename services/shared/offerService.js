import Offer from "../../models/Offer.js";



const computeDiscount = (offer, unitPrice) => {

  if (!offer) return 0;

  let discount = 0;

  if (offer.discountType === "FIXED") {

    discount = offer.discountValue;

  } else {

    /* PERCENTAGE (default) */

    discount = (unitPrice * offer.discountValue) / 100;
  }

  /* maxDiscount is always a rupee cap, regardless
     of discountType */

  if (offer.maxDiscount > 0) {
    discount = Math.min(discount, offer.maxDiscount);
  }

  /* never let a discount exceed the item's own price */

  return Math.min(discount, unitPrice);
};



const buildBadgeLabel = (offer, discountAmount, unitPrice) => {

  if (!offer || discountAmount <= 0 || unitPrice <= 0) {
    return null;
  }

  if (offer.discountType === "FIXED") {
    return `₹${Math.round(discountAmount).toLocaleString("en-IN")} OFF`;
  }

 

  const effectivePercent = (discountAmount / unitPrice) * 100;



  const rounded = Math.round(effectivePercent);

  const display = rounded > 0
    ? rounded
    : Math.round(effectivePercent * 10) / 10;

  return `${display}% OFF`;
};

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

  const productDiscount = computeDiscount(productOffer, variant.price);

  const categoryDiscount = computeDiscount(categoryOffer, variant.price);

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
     BADGE LABEL
     Computed once here from the real numbers so
     no caller has to re-derive percentage/fixed
     display logic (and risk echoing the raw,
     possibly-capped discountValue instead).
  ========================================= */

  const badgeLabel = buildBadgeLabel(
    appliedOffer,
    bestDiscount,
    variant.price,
  );

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

    badgeLabel,

  };

};