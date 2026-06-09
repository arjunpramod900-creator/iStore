import Offer from "../../models/Offer.js";

export const calculateItemOffer =
async (
  product,
  variant,
  quantity = 1,
) => {

  const now = new Date();

  /* PRODUCT OFFER */

  const productOffer =
  await Offer.findOne({

    applyTo: "PRODUCT",

    targetId: product._id,

    isActive: true,

    startDate: {
      $lte: now,
    },

    endDate: {
      $gte: now,
    },

  }).lean();

  /* CATEGORY OFFER */

  const categoryOffer =
  await Offer.findOne({

    applyTo: "CATEGORY",

    targetId: product.categoryId,

    isActive: true,

    startDate: {
      $lte: now,
    },

    endDate: {
      $gte: now,
    },

  }).lean();

  let productDiscount = 0;

  let categoryDiscount = 0;

  /* PRODUCT OFFER VALUE */

  if (productOffer) {

    if (
      productOffer.discountType ===
      "PERCENTAGE"
    ) {

      productDiscount =
      (variant.price *
      productOffer.discountValue)
      / 100;

      if (
        productOffer.maxDiscount > 0
      ) {

        productDiscount =
        Math.min(
          productDiscount,
          productOffer.maxDiscount
        );

      }

    } else {

      productDiscount =
      productOffer.discountValue;

    }

  }

  /* CATEGORY OFFER VALUE */

  if (categoryOffer) {

    if (
      categoryOffer.discountType ===
      "PERCENTAGE"
    ) {

      categoryDiscount =
      (variant.price *
      categoryOffer.discountValue)
      / 100;

      if (
        categoryOffer.maxDiscount > 0
      ) {

        categoryDiscount =
        Math.min(
          categoryDiscount,
          categoryOffer.maxDiscount
        );

      }

    } else {

      categoryDiscount =
      categoryOffer.discountValue;

    }

  }

  /* LARGEST OFFER */

  const bestDiscount =
  Math.max(
    productDiscount,
    categoryDiscount
  );

  const offerPrice =
  variant.price -
  bestDiscount;

  return {

    originalPrice:
      variant.price,

    offerDiscount:
      bestDiscount * quantity,

    finalPrice:
      offerPrice,

  };

};