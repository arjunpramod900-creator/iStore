import {
    validateCoupon
}
from "../user/couponService.js";

import {
    calculateItemOffer
}
from "./offerService.js";

export const calculateCheckoutTotals =
async ({
    cartItems,
    couponCode = null,
    userId = null,
    deliveryType = "standard",
}) => {

    let subtotal = 0;

    let offerDiscount = 0;

    for (const item of cartItems) {

        const offer =
        await calculateItemOffer(

            item.productId,

            item.variantId,

            item.quantity

        );

        subtotal +=
        item.price *
        item.quantity;

        offerDiscount +=
        offer.offerDiscount;
    }

    let couponDiscount = 0;

    let coupon = null;

    if (
        couponCode &&
        userId
    ) {

        const couponResult =
        await validateCoupon(

            couponCode,

            subtotal -
            offerDiscount,

            userId

        );

        if (
            couponResult.success
        ) {

            couponDiscount =
            couponResult.discount;

            coupon =
            couponResult.coupon;
        }
    }

    /* =====================================
       DELIVERY CHARGE
    ===================================== */

    const discountedSubtotal =
        subtotal -
        offerDiscount -
        couponDiscount;

    let deliveryCharge;

    if (
        deliveryType === "express"
    ) {

        deliveryCharge = 500;

    } else {

        deliveryCharge =
            discountedSubtotal >= 5000
            ? 0
            : 99;

    }

    /* =====================================
       TAX
    ===================================== */

    const taxAmount =
    Math.floor(
        discountedSubtotal * 0.02
    );

    /* =====================================
       FINAL TOTAL
    ===================================== */

    const finalAmount =
        discountedSubtotal +
        deliveryCharge +
        taxAmount;

    return {

        subtotal,

        offerDiscount,

        couponDiscount,

        deliveryCharge,

        taxAmount,

        finalAmount,

        coupon,
    };
};