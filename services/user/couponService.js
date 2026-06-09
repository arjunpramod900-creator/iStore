import Coupon from "../../models/Coupon.js";
import CouponUsage from "../../models/CouponUsage.js";

export const validateCoupon =
async (
    code,
    subtotal,
    userId
) => {

    const coupon =
    await Coupon.findOne({

        code:
        code.toUpperCase(),

        isActive: true,

    });

    if (!coupon) {

        return {

            success: false,

            message:

            "Invalid or inactive coupon",

        };

    }


    const now = new Date();

    if (
        now < coupon.startDate ||
        now > coupon.endDate
    ) {

        return {
            success: false,
            message:
            "Coupon expired",
        };
    }

    if (
        subtotal <
        coupon.minPurchase
    ) {

        return {
            success: false,
            message:
            `Minimum purchase ₹${coupon.minPurchase}`,
        };
    }

    if (
        coupon.totalUsageLimit &&
        coupon.usedCount >=
        coupon.totalUsageLimit
    ) {

        return {
            success: false,
            message:
            "Coupon limit reached",
        };
    }

    const usageCount =
    await CouponUsage.countDocuments({

        couponId:
        coupon._id,

        userId,
    });

    if (
        usageCount >=
        coupon.userUsageLimit
    ) {

        return {
            success: false,
            message:
            "Coupon already used",
        };
    }

    let discount = 0;

    if (
        coupon.discountType ===
        "PERCENTAGE"
    ) {

        discount =
        subtotal *
        (
            coupon.discountValue / 100
        );

        if (
            coupon.maxDiscount > 0
        ) {

            discount =
            Math.min(
                discount,
                coupon.maxDiscount
            );
        }

    } else {

        discount =
        coupon.discountValue;
    }

    return {

        success: true,

        coupon,

        discount:
        Math.floor(discount),
    };
};