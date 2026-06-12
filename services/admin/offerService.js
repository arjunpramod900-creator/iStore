import Offer from "../../models/Offer.js";

export const getAllOffersService = async () => {

    return await Offer.find({
        isDeleted: false
    })
    .populate("targetId")
    .sort({ createdAt: -1 });

};

export const createOfferService = async (offerData) => {

    const offer = await Offer.create(offerData);

    return {
        success: true,
        offer
    };

};

export const updateOfferService = async (
    offerId,
    updateData
) => {

    const offer = await Offer.findById(offerId);

    if (!offer) {

        return {
            success: false,
            message: "Offer not found"
        };

    }

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