/* ============================================================
   services/shared/refundCalculator.js
   
   Single source of truth for all refund calculations.
   Used by both user orderService and admin orderService
   so refund logic is 100% consistent.

   KEY INSIGHT from Order model:
   - item.price         = price AFTER offer discount (offer already baked in)
   - item.offerDiscount = the offer saving per unit (stored for display only)
   - order.offerDiscount  = total offer savings across all items
   - order.couponDiscount = coupon saving (applied on discounted subtotal)
   - order.discountAmount = offerDiscount + couponDiscount (combined total)
   - order.subtotal       = sum of (item.price × qty) — already offer-discounted
   - order.taxAmount      = 2% of (subtotal - couponDiscount)
   - order.finalAmount    = subtotal - couponDiscount + taxAmount + deliveryCharge

   REFUND RULES:
   1. Full order cancel/return  → refund order.finalAmount (what they paid)
   2. Single item cancel/return → proportional refund based on item's share
      Formula:
        itemBase              = item.price × item.quantity   (offer already deducted)
        proportionalCoupon    = couponDiscount × (itemBase / order.subtotal)
        proportionalTax       = taxAmount × (itemBase / order.subtotal)
        deliveryRefund        = deliveryCharge if this is the LAST active item, else 0
        refundAmount          = itemBase - proportionalCoupon + proportionalTax + deliveryRefund

   WHY NOT deduct offerDiscount proportionally?
   Because item.price is already the post-offer price. Deducting offerDiscount
   again would double-penalise the customer.

   WHY proportional coupon deduction?
   Coupon discount is order-level. When one item is returned, the customer
   loses a fair share of the coupon benefit proportional to that item's value.
============================================================ */

/**
 * Calculate refund amount for a SINGLE item being cancelled or returned.
 *
 * @param {Object} order   - Full order document (Mongoose doc or lean object)
 * @param {Object} item    - The specific item being cancelled/returned
 * @returns {Object}       - { refundAmount, breakdown }
 */
export const calculateItemRefund = (order, item) => {

    const itemBase = item.price * item.quantity;

    /* Guard against division by zero */
    const subtotal = order.subtotal || itemBase;

    /* Proportion of this item's value vs total order subtotal */
    const itemRatio = itemBase / subtotal;

    /* Proportional share of coupon discount only
       (offer discount is already baked into item.price) */
    const couponDiscount   = order.couponDiscount   || 0;
    const proportionalCoupon = Math.round(couponDiscount * itemRatio);

    /* Proportional share of tax paid on this item */
    const taxAmount        = order.taxAmount        || 0;
    const proportionalTax  = Math.round(taxAmount * itemRatio);

    /* Delivery refund: only if this cancellation leaves NO active items
       i.e. the customer is effectively cancelling the whole order via items */
    const activeItemsAfter = order.items.filter(
        i =>
            String(i._id) !== String(item._id) &&
            !["Cancelled", "Returned"].includes(i.itemStatus)
    );

    const deliveryRefund = activeItemsAfter.length === 0
        ? (order.deliveryCharge || 0)
        : 0;

    /* Final refund amount — floor to avoid fractional paise */
    const refundAmount = Math.floor(
        itemBase
        - proportionalCoupon
        + proportionalTax
        + deliveryRefund
    );

    return {
        refundAmount: Math.max(0, refundAmount), /* never negative */
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
 * Calculate refund amount for a FULL order cancel or return.
 * Simple — just refund what they paid.
 *
 * @param {Object} order - Full order document
 * @returns {Object}     - { refundAmount, breakdown }
 */
export const calculateFullOrderRefund = (order) => {

    const refundAmount = order.finalAmount || 0;

    return {
        refundAmount,
        breakdown: {
            finalAmount:     order.finalAmount,
            subtotal:        order.subtotal,
            offerDiscount:   order.offerDiscount,
            couponDiscount:  order.couponDiscount,
            taxAmount:       order.taxAmount,
            deliveryCharge:  order.deliveryCharge,
        },
    };
};

/**
 * Recalculate order totals after one or more items are removed.
 * Used after item cancel/return to keep order financials accurate.
 *
 * IMPORTANT: offerDiscount is already reflected in item.price,
 * so we do NOT re-subtract it from the recalculated total.
 * We only preserve the couponDiscount proportionally.
 *
 * @param {Object} order      - Full order document
 * @param {Array}  activeItems - Items still active (not Cancelled/Returned)
 * @returns {Object}           - Updated financial fields to save on order
 */
export const recalculateOrderTotals = (order, activeItems) => {

    /* New subtotal from active items only */
    const newSubtotal = activeItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    /* Proportional coupon discount based on remaining subtotal
       Cap at newSubtotal to avoid negative finalAmount */
    const originalSubtotal  = order.subtotal || newSubtotal;
    const remainingRatio    = originalSubtotal > 0
        ? Math.min(newSubtotal / originalSubtotal, 1)
        : 0;

    const remainingCouponDiscount = Math.round(
        (order.couponDiscount || 0) * remainingRatio
    );

    /* Tax on remaining discounted subtotal */
    const discountedSubtotal = newSubtotal - remainingCouponDiscount;
    const newTaxAmount       = Math.floor(discountedSubtotal * 0.02);

    /* Delivery: free if remaining discounted subtotal >= 5000 */
    const newDeliveryCharge  = discountedSubtotal >= 5000 ? 0 : 99;

    /* If no active items remain, delivery = 0 */
    const finalDeliveryCharge = activeItems.length === 0 ? 0 : newDeliveryCharge;

    /* Final amount */
    const newFinalAmount = Math.max(
        0,
        discountedSubtotal + newTaxAmount + finalDeliveryCharge
    );

    return {
        subtotal:        newSubtotal,
        taxAmount:       newTaxAmount,
        deliveryCharge:  finalDeliveryCharge,
        couponDiscount:  remainingCouponDiscount,
        /* offerDiscount stays as-is — it's display-only, baked into item.price */
        discountAmount:  (order.offerDiscount || 0) + remainingCouponDiscount,
        finalAmount:     newFinalAmount,
    };
};