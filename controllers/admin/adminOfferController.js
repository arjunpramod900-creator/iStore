import Product from "../../models/Product.js";
import Category from "../../models/Category.js";
import Variant from "../../models/Variant.js";

import {
    getAllOffersService,
    createOfferService,
    updateOfferService,
    deleteOfferService
}
from "../../services/admin/offerService.js";


/* =========================================
   LOAD OFFERS PAGE
========================================= */

export const loadOffersPage =
async (
    req,
    res
) => {

    try {

        const offers =
        await getAllOffersService();

        const products =
        await Product.find({

            isActive: true,

            isDeleted: false

        })
        .sort({
            name: 1
        })
        .lean();

        const categories =
        await Category.find({

            isActive: true,

            isDeleted: false

        })
        .sort({
            name: 1
        })
        .lean();

        /* =========================================
           ATTACH REAL PRICES
           Products: price of their lowest-priced
           active, non-deleted variant. Categories:
           lowest price among all products in that
           category ("starting from"). Both default
           to 0 when no priced variant/product exists,
           so the EJS can fall back to the simulated
           sample price for that one option only.
        ========================================= */

        for (const product of products) {

            const cheapestVariant =
            await Variant.findOne({

                productId: product._id,

                isDeleted: false,

            })
            .sort({
                price: 1
            })
            .lean();

            product.lowestPrice =
                cheapestVariant?.price || 0;
        }

        for (const category of categories) {

            const categoryProducts =
            await Product.find({

                categoryId: category._id,

                isActive: true,

                isDeleted: false,

            })
            .select("_id")
            .lean();

            const productIds =
                categoryProducts.map(p => p._id);

            let lowestPrice = 0;

            if (productIds.length > 0) {

                const cheapestVariant =
                await Variant.findOne({

                    productId: {
                        $in: productIds
                    },

                    isDeleted: false,

                })
                .sort({
                    price: 1
                })
                .lean();

                lowestPrice =
                    cheapestVariant?.price || 0;
            }

            category.lowestPrice = lowestPrice;
        }

        return res.render(
            "admin/offers",
            {
                page: "offers",
                offers,
                products,
                categories
            }
        );

    }

    catch (error) {

        console.log(
            "Load Offers Error:",
            error
        );

        return res.redirect(
            "/admin/dashboard"
        );

    }

};


/* =========================================
   ADD OFFER
========================================= */

export const addOffer =
async (
    req,
    res
) => {

    try {

        const {

            offerName,

            targetId,

            applyTo,

            discountType,

            discountValue,

            maxDiscount,

            minPurchase,

            startDate,

            endDate,

            isActive

        } = req.body;

        const response =
        await createOfferService({

            offerName,

            targetId,

            applyTo,

            applyToModel:
            applyTo === "PRODUCT"
            ? "Product"
            : "Category",

            discountType:
            discountType === "FIXED"
            ? "FIXED"
            : "PERCENTAGE",

            discountValue,

            maxDiscount,

            minPurchase,

            startDate,

            endDate,

            isActive:
            isActive === "true"

        });

            return res.json({
                success: response.success,
                message: response.message || null,
            });

    }

    catch (error) {

        console.log(
            "Add Offer Error:",
            error
        );

        return res.json({

            success: false,

            message:
            "Failed to create offer"

        });

    }

};


/* =========================================
   EDIT OFFER
========================================= */

export const editOffer =
async (
    req,
    res
) => {

    try {

        const offerId =
        req.params.id;

        const {

            offerName,

            targetId,

            applyTo,

            discountType,

            discountValue,

            maxDiscount,

            minPurchase,

            startDate,

            endDate,

            isActive

        } = req.body;

        const response =
        await updateOfferService(

            offerId,

            {

                offerName,

                targetId,

                applyTo,

                applyToModel:
                applyTo === "PRODUCT"
                ? "Product"
                : "Category",

                discountType:
                discountType === "FIXED"
                ? "FIXED"
                : "PERCENTAGE",

                discountValue,

                maxDiscount,

                minPurchase,

                startDate,

                endDate,

                isActive:
                isActive === "true"

            }

        );

        if (!response.success) {

            return res.json({

                success: false,

                message:
                response.message

            });

        }

        return res.json({

            success: true

        });

    }

    catch (error) {

        console.log(
            "Edit Offer Error:",
            error
        );

        return res.json({

            success: false,

            message:
            "Failed to update offer"

        });

    }

};


/* =========================================
   DELETE OFFER
========================================= */

export const deleteOffer =
async (
    req,
    res
) => {

    try {

        const response =
        await deleteOfferService(

            req.params.id

        );

        if (!response.success) {

            return res.json({

                success: false,

                message:
                response.message

            });

        }

        return res.json({

            success: true

        });

    }

    catch (error) {

        console.log(
            "Delete Offer Error:",
            error
        );

        return res.json({

            success: false,

            message:
            "Failed to delete offer"

        });

    }

};