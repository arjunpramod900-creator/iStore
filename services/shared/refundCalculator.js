/**
 * SINGLE ITEM REFUND
 *
 * Calculates how much to refund for one cancelled/returned item.
 * Reads exclusively from pricingSnapshot — never from mutable order totals.
 * Does NOT modify any order fields.
 */
export const calculateItemRefund = (order, item) => {

const itemBase = item.price * item.quantity;

/*
    Immutable calculation.

    Refund percentage is always calculated from the
    ORIGINAL order subtotal stored in pricingSnapshot.

    Therefore the refund for an item never changes,
    regardless of how many other items are cancelled
    or returned later.
*/
const originalSubtotal =
    order.pricingSnapshot?.originalSubtotal ??
    order.subtotal ??
    itemBase;

const itemRatio =
    originalSubtotal > 0
        ? itemBase / originalSubtotal
        : 0;

    /* Original values from pricing snapshot */
const originalCoupon =
    order.pricingSnapshot?.originalCouponDiscount ?? 0;

const originalTax =
    order.pricingSnapshot?.originalTaxAmount ?? 0;

const originalDelivery =
    order.pricingSnapshot?.originalDeliveryCharge ?? 0;

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
 *
 * Returns the original finalAmount from pricingSnapshot.
 * Falls back to order.finalAmount for older orders without a snapshot.
 * Does NOT modify any order fields.
 */
export const calculateFullOrderRefund = (order) => {

    const refundAmount =
        order.pricingSnapshot?.originalFinalAmount ??
        order.finalAmount ??
        0;

    return {

        refundAmount,

        breakdown: {

            subtotal:
                order.pricingSnapshot?.originalSubtotal
                ?? order.subtotal,

            offerDiscount:
                order.pricingSnapshot?.originalOfferDiscount
                ?? order.offerDiscount,

            couponDiscount:
                order.pricingSnapshot?.originalCouponDiscount
                ?? order.couponDiscount,

            taxAmount:
                order.pricingSnapshot?.originalTaxAmount
                ?? order.taxAmount,

            deliveryCharge:
                order.pricingSnapshot?.originalDeliveryCharge
                ?? order.deliveryCharge,

            finalAmount:
                refundAmount,

        },

    };

};
