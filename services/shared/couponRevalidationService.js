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

    // 4. Recalculate Order totals (excluding mutated items)
    order.subtotal = activeSubtotal;
    order.finalAmount = activeSubtotal - order.couponDiscount + order.taxAmount + order.deliveryCharge;

    // 5. Compute refund amount for the mutated item
    let refundAmount = 0;
    const itemPreRevocationValue = mutatedItem.finalPrice;
    const itemFullValue = mutatedItem.price * mutatedItem.quantity;

    if (mutationType === "cancelled" || mutationType === "returned") {
        if (couponRevoked) {
            refundAmount = itemFullValue;
        } else {
            refundAmount = itemPreRevocationValue;
        }
    }

    // Never refund more than original snapshot
    // But since the item is removed, we just give back its calculated refundAmount.

    // 6. API Response Message
    let message = "";
    if (couponRevoked && coupon) {
        message = `Coupon ${couponCode} has been revoked as order total dropped below ₹${coupon.minPurchase}. Refund of ₹${refundAmount} will be processed.`;
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
