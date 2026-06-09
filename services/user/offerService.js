import Offer from "../../models/Offer.js";

export const calculateOfferDiscount =
async (cartItems) => {

    const now = new Date();

    let totalOfferDiscount = 0;

    for (const item of cartItems) {

        const productOffer =
        await Offer.findOne({
            applyTo: "PRODUCT",
            targetId: item.productId._id,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
        });

        const categoryOffer =
        await Offer.findOne({
            applyTo: "CATEGORY",
            targetId: item.productId.categoryId,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
        });

        let bestDiscount = 0;

        const itemTotal =
        item.price * item.quantity;

        if (productOffer) {

            if (
                productOffer.discountType ===
                "PERCENTAGE"
            ) {

                bestDiscount =
                itemTotal *
                (
                    productOffer.discountValue / 100
                );

            } else {

                bestDiscount =
                productOffer.discountValue;
            }
        }

        if (categoryOffer) {

            let categoryDiscount = 0;

            if (
                categoryOffer.discountType ===
                "PERCENTAGE"
            ) {

                categoryDiscount =
                itemTotal *
                (
                    categoryOffer.discountValue / 100
                );

            } else {

                categoryDiscount =
                categoryOffer.discountValue;
            }

            bestDiscount =
            Math.max(
                bestDiscount,
                categoryDiscount
            );
        }

        totalOfferDiscount +=
        bestDiscount;
    }

    return Math.floor(
        totalOfferDiscount
    );
};