import Coupon from "../../models/Coupon.js";
import CouponUsage from "../../models/CouponUsage.js";

/**
 * Re-validates coupon and calculates refund when an item is cancelled or returned.
 * Mutates order object (active items' finalPrice, couponDiscount, finalAmount) in place.
 * Does NOT call .save() on the order.
 * Returns { refundAmount, message, couponRevoked }
 */
export const revalidateCouponOnMutation = async (order, mutatedItem, mutationType) => {
    let activeSubtotal = 0;
    const activeItems = [];

    // 1. Identify active items and compute active subtotal
    for (const item of order.items) {
        // Exclude the mutated item
        if (String(item._id) === String(mutatedItem._id)) {
            continue;
        }

        if (
            item.itemStatus !== "Cancelled" &&
            item.itemStatus !== "Returned" &&
            item.itemReturnStatus !== "Approved"
        ) {
            activeSubtotal += item.price * item.quantity;
            activeItems.push(item);
        }
    }

    let couponRevoked = false;
    let coupon = null;
    let totalCouponDiscount = 0;
    let couponCode = order.couponCode || null;

    // 2. Re-validate coupon if there is one
    if (order.couponId) {
        coupon = await Coupon.findById(order.couponId);
    }

    if (coupon) {
        if (activeSubtotal >= coupon.minPurchase) {
            // Coupon still valid
            couponRevoked = false;

            if (coupon.discountType === "PERCENTAGE") {
                totalCouponDiscount = activeSubtotal * (coupon.discountValue / 100);
                if (coupon.maxDiscount > 0) {
                    totalCouponDiscount = Math.min(totalCouponDiscount, coupon.maxDiscount);
                }
            } else {
                totalCouponDiscount = coupon.discountValue;
            }
            totalCouponDiscount = Math.min(totalCouponDiscount, activeSubtotal);
        } else {
            // Coupon revoked
            couponRevoked = true;
            totalCouponDiscount = 0;
        }
    }

    // 3. Redistribute or remove coupon discount across active items
    let distributed = 0;
    let maxShare = -1;
    let maxIdx = 0;

    order.couponDiscount = Math.floor(totalCouponDiscount);

    if (activeItems.length > 0) {
        if (totalCouponDiscount > 0) {
            activeItems.forEach((item, idx) => {
                const lineTotal = item.price * item.quantity;
                const share = Math.floor((lineTotal / activeSubtotal) * totalCouponDiscount);
                
                item.couponDiscount = share;
                item.finalPrice = lineTotal - share;
                
                distributed += share;
                
                if (share > maxShare) {
                    maxShare = share;
                    maxIdx = idx;
                }
            });

            // Handle rounding remainder
            const remainder = totalCouponDiscount - distributed;
            if (remainder > 0) {
                activeItems[maxIdx].couponDiscount += remainder;
                activeItems[maxIdx].finalPrice -= remainder;
            }
        } else {
            // No coupon discount (revoked or none)
            for (const item of activeItems) {
                item.couponDiscount = 0;
                item.finalPrice = item.price * item.quantity;
            }
        }
    }

    // Capture previous final amount before recalculating
    const previousFinalAmount = order.finalAmount || 0;

    // 4. Recalculate Order totals (excluding mutated items)
    //    Update offerDiscount to reflect only active items — excluding the cancelled item's offer.
    const activeOfferDiscount = activeItems.reduce(
        (sum, item) => sum + ((item.offerDiscount || 0) * item.quantity), 0
    );

    const discountedSubtotal = activeSubtotal - order.couponDiscount;
    const newTaxAmount = Math.floor(discountedSubtotal * 0.02);
    
    let newDeliveryCharge = order.deliveryCharge || 0;
    // Recalculate standard delivery if applicable
    if (newDeliveryCharge === 0 || newDeliveryCharge === 99) {
        newDeliveryCharge = discountedSubtotal >= 5000 ? 0 : 99;
    }

    order.subtotal      = activeSubtotal;
    order.offerDiscount = activeOfferDiscount;
    order.taxAmount     = newTaxAmount;
    order.deliveryCharge = newDeliveryCharge;
    order.finalAmount   = discountedSubtotal + newTaxAmount + newDeliveryCharge;

    // 5. Compute refund amount for the mutated item
    //    The refund is strictly the difference between what the order cost before cancellation 
    //    and what it costs now. This perfectly handles:
    //    - Refunding the tax paid on the cancelled item
    //    - Recovering the lost coupon discount from the refund if the coupon is revoked, 
    //      closing the loophole where users get unearned discounts on remaining items.
    let refundAmount = 0;

    if (mutationType === "cancelled" || mutationType === "returned") {
        refundAmount = previousFinalAmount - order.finalAmount;
        if (refundAmount < 0) refundAmount = 0; // Cap at 0 to avoid charging user
    }

    // 6. API Response Message
    let message = "";
    if (couponRevoked && coupon) {
        message = `Coupon ${couponCode} revoked as order total dropped below ₹${coupon.minPurchase}. The lost discount on remaining items was deducted from your refund. Refund of ₹${refundAmount} will be processed.`;
    } else {
        message = `Item ${mutationType}. Refund of ₹${refundAmount} will be processed.`;
    }

    // 7. Cleanup CouponUsage if all items are resolved
    if (activeItems.length === 0 && order.couponId) {
        // Full cancellation/return
        const usage = await CouponUsage.findOneAndDelete({
            couponId: order.couponId,
            orderId: order._id,
        });
        if (usage) {
            await Coupon.findByIdAndUpdate(order.couponId, {
                $inc: { usedCount: -1 }
            });
        }
    }

    return {
        refundAmount,
        message,
        couponRevoked
    };
};
