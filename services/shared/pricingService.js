import { validateCoupon }    from "../user/couponService.js";
import { calculateItemOffer } from "./offerService.js";

/* =========================================
   CALCULATE CHECKOUT TOTALS
   
   NOTE on item.price:
   cart.item.price = original variant price (NOT offer-discounted).
   offerService calculates the discount separately.
   So: subtotal = sum of (item.price × qty)  ← original prices
       offerDiscount = sum of per-item offer savings
       discountedSubtotal = subtotal - offerDiscount - couponDiscount
   This is correct — no double deduction.
========================================= */
export const calculateCheckoutTotals = async ({
    cartItems,
    couponCode   = null,
    userId       = null,
    deliveryType = "standard",
}) => {

    let subtotal      = 0;
    let offerDiscount = 0;

    for (const item of cartItems) {
        const offer = await calculateItemOffer(
            item.productId,
            item.variantId,
            item.quantity,
        );

        subtotal      += item.price * item.quantity;  /* original price × qty */
        offerDiscount += offer.offerDiscount;          /* per-item offer saving */
    }

    /* Subtotal after offers — used as base for coupon validation */
    const offerDiscountedSubtotal = subtotal - offerDiscount;

    let couponDiscount = 0;
    let coupon         = null;

    if (couponCode && userId) {
        const couponResult = await validateCoupon(
            couponCode,
            offerDiscountedSubtotal,
            userId,
        );

        if (couponResult.success) {
            couponDiscount = couponResult.discount;
            coupon         = couponResult.coupon;
        }
    }

    const discountedSubtotal = offerDiscountedSubtotal - couponDiscount;

    /* DELIVERY */
    let deliveryCharge;
    if (deliveryType === "express") {
        deliveryCharge = 500;
    } else {
        deliveryCharge = discountedSubtotal >= 5000 ? 0 : 99;
    }

    /* TAX — 2% on discounted subtotal */
    const taxAmount = Math.floor(discountedSubtotal * 0.02);

    /* FINAL */
    const finalAmount = discountedSubtotal + deliveryCharge + taxAmount;

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