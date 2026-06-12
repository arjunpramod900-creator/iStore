import Offer from "../../models/Offer.js";

export const getAllOffersService = async () => {

    return await Offer.find({
        isDeleted: false
    })
    .populate("targetId")
    .sort({ createdAt: -1 });

};

export const createOfferService = async (offerData) => {

const {
    offerName,
    targetId,
    applyTo,
    discountValue,
    maxDiscount,
    minPurchase,
    startDate,
    endDate,
} = offerData;

    if (
        !offerName ||
        !targetId ||
        !applyTo
    ) {

        return {
            success: false,
            message: "All required fields must be filled",
        };

    }

    if (
        Number(discountValue) <= 0 ||
        Number(discountValue) > 90
    ) {

        return {
            success: false,
            message: "Discount must be between 1% and 90%",
        };

    }

    if (
        new Date(startDate) >=
        new Date(endDate)
    ) {

        return {
            success: false,
            message: "End date must be after start date",
        };

    }
    /* =========================
   PAST DATE VALIDATION
========================= */

const today = new Date();

today.setHours(
    0,
    0,
    0,
    0
);

if (
    new Date(endDate) < today
) {

    return {

        success: false,

        message:
        "Offer cannot end in the past",

    };

}

/* =========================
   MAX DISCOUNT VALIDATION
========================= */

if (
    Number(maxDiscount) < 0
) {

    return {

        success: false,

        message:
        "Maximum discount cannot be negative",

    };

}

/* =========================
   MIN PURCHASE VALIDATION
========================= */

if (
    Number(minPurchase) < 0
) {

    return {

        success: false,

        message:
        "Minimum purchase cannot be negative",

    };

}

    const existingOffer =
    await Offer.findOne({

        targetId,

        applyTo,

        isDeleted: false,

    });

    if (existingOffer) {

        return {

            success: false,

            message:
            "An offer already exists for this target",

        };

    }

    const offer =
    await Offer.create(offerData);

    return {

        success: true,

        offer,

    };

};

export const updateOfferService = async (
    offerId,
    updateData
) => {

    const offer =
    await Offer.findById(
        offerId
    );

    if (!offer) {

        return {
            success: false,
            message: "Offer not found"
        };

    }

const {
    offerName,
    targetId,
    applyTo,
    discountValue,
    maxDiscount,
    minPurchase,
    startDate,
    endDate,
} = updateData;

    /* =========================
       REQUIRED VALIDATION
    ========================= */

    if (

        !offerName ||

        !targetId ||

        !applyTo

    ) {

        return {

            success: false,

            message:
            "All required fields are mandatory"

        };

    }

    /* =========================
       DISCOUNT VALIDATION
    ========================= */

    if (

        Number(discountValue) <= 0 ||

        Number(discountValue) > 90

    ) {

        return {

            success: false,

            message:
            "Discount must be between 1% and 90%"

        };

    }

    /* =========================
       DATE VALIDATION
    ========================= */

    if (

        new Date(startDate) >=

        new Date(endDate)

    ) {

        return {

            success: false,

            message:
            "End date must be after start date"

        };

    }

    /* =========================
   PAST DATE VALIDATION
========================= */

const today = new Date();

today.setHours(
    0,
    0,
    0,
    0
);

if (
    new Date(endDate) < today
) {

    return {

        success: false,

        message:
        "Offer cannot end in the past"

    };

}

/* =========================
   MAX DISCOUNT VALIDATION
========================= */

if (
    Number(maxDiscount) < 0
) {

    return {

        success: false,

        message:
        "Maximum discount cannot be negative"

    };

}

/* =========================
   MIN PURCHASE VALIDATION
========================= */

if (
    Number(minPurchase) < 0
) {

    return {

        success: false,

        message:
        "Minimum purchase cannot be negative"

    };

}

    /* =========================
       DUPLICATE VALIDATION
    ========================= */

    const existingOffer =
    await Offer.findOne({

        _id: {
            $ne: offerId
        },

        targetId,

        applyTo,

        isDeleted: false,

    });

    if (existingOffer) {

        return {

            success: false,

            message:
            "Another offer already exists for this target"

        };

    }

    /* =========================
       UPDATE
    ========================= */

    Object.assign(
        offer,
        updateData
    );

    await offer.save();

    return {

        success: true,

        offer

    };

};

export const deleteOfferService = async (
    offerId
) => {

    const offer =
    await Offer.findById(
        offerId
    );

    if (!offer) {

        return {
            success: false,
            message: "Offer not found"
        };

    }

    offer.isDeleted = true;

    await offer.save();

    return {
        success: true
    };

};