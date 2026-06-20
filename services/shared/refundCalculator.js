/**
 * SINGLE ITEM REFUND
 */
export const calculateItemRefund = (order, item) => {

    const itemBase = item.price * item.quantity;

    /* Active subtotal BEFORE cancelling this item */
    const activeSubtotal =
        order.items.reduce(
            (total, i) =>
                total +
                (
                    ["Cancelled", "Returned"].includes(i.itemStatus)
                        ? 0
                        : i.price * i.quantity
                ),
            0
        ) || itemBase;

    const itemRatio = itemBase / activeSubtotal;

    /* Original values from pricing snapshot */
    const originalCoupon =
        order.pricingSnapshot?.originalCouponDiscount || 0;

    const originalTax =
        order.pricingSnapshot?.originalTaxAmount || 0;

    const originalDelivery =
        order.pricingSnapshot?.originalDeliveryCharge || 0;

    const proportionalCoupon =
        Math.round(originalCoupon * itemRatio);

    const proportionalTax =
        Math.round(originalTax * itemRatio);

    /* Will this cancellation empty the order? */
    const activeItemsAfter = order.items.filter(
        i =>
            String(i._id) !== String(item._id) &&
            !["Cancelled", "Returned"].includes(i.itemStatus)
    );

    const deliveryRefund =
        activeItemsAfter.length === 0
            ? originalDelivery
            : 0;

    const refundAmount =
        Math.floor(
            itemBase
            - proportionalCoupon
            + proportionalTax
            + deliveryRefund
        );

    return {
        refundAmount: Math.max(0, refundAmount),
        breakdown: {
            itemBase,
            proportionalCoupon,
            proportionalTax,
            deliveryRefund,
            itemRatio: Math.round(itemRatio * 100) + "%",
        },
    };

};


/**
 * FULL ORDER REFUND
 */
export const calculateFullOrderRefund = (order) => {

    return {

        refundAmount:
            order.finalAmount || 0,

        breakdown: {

            subtotal:
                order.pricingSnapshot?.originalSubtotal
                || order.subtotal,

            offerDiscount:
                order.pricingSnapshot?.originalOfferDiscount
                || order.offerDiscount,

            couponDiscount:
                order.pricingSnapshot?.originalCouponDiscount
                || order.couponDiscount,

            taxAmount:
                order.pricingSnapshot?.originalTaxAmount
                || order.taxAmount,

            deliveryCharge:
                order.pricingSnapshot?.originalDeliveryCharge
                || order.deliveryCharge,

            finalAmount:
                order.pricingSnapshot?.originalFinalAmount
                || order.finalAmount,

        },

    };

};


/**
 * RECALCULATE ORDER TOTALS AFTER PARTIAL CANCELLATION
 */
export const recalculateOrderTotals = (
    order,
    activeItems
) => {

    const newSubtotal =
        activeItems.reduce(
            (total, item) =>
                total +
                item.price * item.quantity,
            0
        );

    const originalSubtotal =
        order.pricingSnapshot?.originalSubtotal ||
        order.items.reduce(
            (total, item) =>
                total +
                item.price * item.quantity,
            0
        );

    const ratio =
        originalSubtotal > 0
            ? newSubtotal / originalSubtotal
            : 0;

    const remainingCouponDiscount =
        Math.round(
            (
                order.pricingSnapshot?.originalCouponDiscount
                || 0
            ) * ratio
        );

    const discountedSubtotal =
        Math.max(
            0,
            newSubtotal - remainingCouponDiscount
        );

    /*
        Tax should shrink proportionally,
        not be recalculated from current tax rate.
    */
    const remainingTax =
        Math.round(
            (
                order.pricingSnapshot?.originalTaxAmount
                || 0
            ) * ratio
        );

    /*
        Delivery should NEVER increase.
    */
    let deliveryCharge =
        order.pricingSnapshot?.originalDeliveryCharge
        || 0;

    if (activeItems.length === 0) {
        deliveryCharge = 0;
    }

    const finalAmount =
        Math.max(
            0,
            discountedSubtotal +
            remainingTax +
            deliveryCharge
        );

    return {

        subtotal:
            newSubtotal,

        taxAmount:
            remainingTax,

        deliveryCharge,

        couponDiscount:
            remainingCouponDiscount,

        discountAmount:
            (
                order.pricingSnapshot?.originalOfferDiscount
                || order.offerDiscount
            ) +
            remainingCouponDiscount,

        finalAmount,

    };

};