import Offer from "../../models/Offer.js";
import Product from "../../models/Product.js";
import Category from "../../models/Category.js";

export const getAllOffersService = async (query = {}) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;
  const search = query.search || "";

  let filter = { isDeleted: false };

  if (search) {
    filter.offerName = { $regex: search, $options: "i" };
  }

  const totalOffers = await Offer.countDocuments(filter);
  const totalPages = Math.ceil(totalOffers / limit);

  const offers = await Offer.find(filter)
    .populate("targetId")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return {
    offers,
    totalPages,
    currentPage: page,
    search,
    totalOffers,
    limit,
  };
};

/* =========================================
   SHARED VALIDATION
   (used by both create and update — keeps the
   two functions from drifting out of sync, which
   was already a small risk before this patch)
========================================= */

const validateOfferFields = ({
  offerName,
  targetId,
  applyTo,
  discountType,
  discountValue,
  maxDiscount,
  minPurchase,
  startDate,
  endDate,
}) => {
  if (!offerName || !targetId || !applyTo) {
    return "All required fields must be filled";
  }

  /* =========================
       DISCOUNT VALIDATION
       Percentage: bounded 1-90 (unchanged).
       Fixed: must be a positive rupee value. No
       upper bound is enforced here since a fixed
       discount is meaningless to cap at "90" —
       it's compared against the actual item price
       at calculation time instead.
    ========================= */

  if (discountType === "FIXED") {
    if (Number(discountValue) <= 0) {
      return "Discount amount must be greater than 0";
    }
  } else {
    if (Number(discountValue) <= 0 || Number(discountValue) > 90) {
      return "Discount must be between 1% and 90%";
    }
  }

  /* =========================
       DATE VALIDATION
    ========================= */

  if (new Date(startDate) >= new Date(endDate)) {
    return "End date must be after start date";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (new Date(endDate) < today) {
    return "Offer cannot end in the past";
  }

  /* =========================
       MAX DISCOUNT VALIDATION
       maxDiscount is always a rupee cap, regardless
       of discountType (see calculateItemOffer).
    ========================= */

  if (Number(maxDiscount) < 0) {
    return "Maximum discount cannot be negative";
  }

  /* =========================
       MIN PURCHASE VALIDATION
    ========================= */

  if (Number(minPurchase) < 0) {
    return "Minimum purchase cannot be negative";
  }

  return null;
};

const validateTarget = async (applyTo, targetId) => {
  if (applyTo === "PRODUCT") {
    const product = await Product.findOne({
      _id: targetId,
      isDeleted: false,
    });

    if (!product) {
      return "Selected product does not exist";
    }
  }

  if (applyTo === "CATEGORY") {
    const category = await Category.findOne({
      _id: targetId,
      isDeleted: false,
    });

    if (!category) {
      return "Selected category does not exist";
    }
  }

  return null;
};

export const createOfferService = async (offerData) => {
  const { targetId, applyTo } = offerData;

  const fieldError = validateOfferFields(offerData);

  if (fieldError) {
    return {
      success: false,
      message: fieldError,
    };
  }

  const targetError = await validateTarget(applyTo, targetId);

  if (targetError) {
    return {
      success: false,
      message: targetError,
    };
  }

  const existingOffer = await Offer.findOne({
    targetId,
    applyTo,
    isDeleted: false,
  });

  if (existingOffer) {
    return {
      success: false,
      message: "An offer already exists for this target",
    };
  }

  const offer = await Offer.create(offerData);

  return {
    success: true,
    offer,
  };
};

export const updateOfferService = async (offerId, updateData) => {
  const offer = await Offer.findById(offerId);

  if (!offer) {
    return {
      success: false,
      message: "Offer not found",
    };
  }

  const { targetId, applyTo } = updateData;

  const fieldError = validateOfferFields(updateData);

  if (fieldError) {
    return {
      success: false,
      message: fieldError,
    };
  }

  const targetError = await validateTarget(applyTo, targetId);

  if (targetError) {
    return {
      success: false,
      message: targetError,
    };
  }

  /* =========================
       DUPLICATE VALIDATION
    ========================= */

  const existingOffer = await Offer.findOne({
    _id: { $ne: offerId },
    targetId,
    applyTo,
    isDeleted: false,
  });

  if (existingOffer) {
    return {
      success: false,
      message: "Another offer already exists for this target",
    };
  }

  /* =========================
       UPDATE
    ========================= */

  Object.assign(offer, updateData);

  await offer.save();

  return {
    success: true,
    offer,
  };
};

export const deleteOfferService = async (offerId) => {
  const offer = await Offer.findById(offerId);

  if (!offer) {
    return {
      success: false,
      message: "Offer not found",
    };
  }

  offer.isDeleted = true;

  await offer.save();

  return {
    success: true,
  };
};
