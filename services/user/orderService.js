import Order from "../../models/Order.js";
import Variant from "../../models/Variant.js";
import { creditWallet } from "../shared/walletService.js";
import {
    calculateItemRefund,
    calculateFullOrderRefund,

} from "../shared/refundCalculator.js";
import { revalidateCouponOnMutation } from "../shared/couponRevalidationService.js";
import CouponUsage from "../../models/CouponUsage.js";
import Coupon from "../../models/Coupon.js";

/* =========================================
   LOAD ORDERS
========================================= */
export const loadOrdersService = async ({
    userId,
    search = "",
    status = "",
    sort   = "newest",
    page   = 1,
    limit  = 5,
}) => {
    const query = { userId };

    if (search.trim()) {
        query.$or = [
            { orderId:             { $regex: search.trim(), $options: "i" } },
            { "items.productName": { $regex: search.trim(), $options: "i" } },
        ];
    }

    if (status.trim()) {
        query.orderStatus = { $regex: `^${status}$`, $options: "i" };
    }

    let sortOption = { createdAt: -1 };
    switch (sort) {
        case "oldest":      sortOption = { createdAt: 1 };    break;
        case "amount_high": sortOption = { finalAmount: -1 }; break;
        case "amount_low":  sortOption = { finalAmount: 1 };  break;
        default:            sortOption = { createdAt: -1 };
    }

    const currentPage = Math.max(Number(page) || 1, 1);
    const skip        = (currentPage - 1) * limit;
    const totalOrders = await Order.countDocuments(query);
    const totalPages  = Math.max(Math.ceil(totalOrders / limit), 1);

    const orders = await Order.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean();

    return {
        success: true,
        orders,
        pagination: {
            currentPage,
            totalPages,
            totalOrders,
            hasNextPage: currentPage < totalPages,
            hasPrevPage: currentPage > 1,
        },
    };
};

/* =========================================
   LOAD ORDER DETAILS
========================================= */
export const loadOrderDetailsService = async (userId, orderId) => {
    const order = await Order.findOne({ userId, orderId }).lean();
    if (!order) return { success: false, message: "Order not found" };
    return { success: true, order };
};

/* =========================================
   CANCEL FULL ORDER
========================================= */
export const cancelOrderService = async (userId, orderId, reason) => {

    const order = await Order.findOne({ userId, orderId });

    if (!order) {
        return {
            success: false,
            message: "Order not found",
        };
    }

    if (!["Pending", "Processing"].includes(order.orderStatus)) {
        return {
            success: false,
            message: "Order can no longer be cancelled",
        };
    }

    /* Restore stock */
    const bulkOperations = [];

    for (const item of order.items) {

        if (
            item.itemStatus === "Cancelled" ||
            item.itemStatus === "Returned"
        ) {
            continue;
        }

        bulkOperations.push({
            updateOne: {
                filter: {
                    _id: item.variantId,
                },
                update: {
                    $inc: {
                        stock: item.quantity,
                    },
                },
            },
        });

        item.itemStatus = "Cancelled";

        item.cancelReason =
            reason || "Order cancelled by customer";
    }

    if (bulkOperations.length > 0) {

        await Variant.bulkWrite(
            bulkOperations,
            {
                ordered: false,
            }
        );

    }

    if (order.couponId) {
        const usage = await CouponUsage.findOneAndDelete({
            couponId: order.couponId,
            orderId: order._id,
        });
        if (usage) {
            await Coupon.findByIdAndUpdate(order.couponId, { $inc: { usedCount: -1 } });
        }
    }

    /* Wallet refund only once */
    if (
        ["RAZORPAY", "WALLET"].includes(order.paymentMethod) &&
        !order.isRefundProcessed
    ) {

        const { refundAmount } =
            calculateFullOrderRefund(order);

        if (refundAmount > 0) {

            await creditWallet({
                userId,
                amount: refundAmount,
                transactionType: "CancellationRefund",
                description:
                    `Refund for cancelled order ${order.orderId}`,
                orderId: order._id,
            });

            order.refundAmount += refundAmount;
            order.isRefundProcessed = true;
            order.paymentStatus = "Refunded";
        }
    }

    order.orderStatus = "Cancelled";

    order.cancelReason =
        reason || "Order cancelled by customer";

    await order.save();

    return {
        success: true,
        message:
            order.paymentMethod === "COD"
                ? "Order cancelled successfully"
                : "Order cancelled and refund credited to wallet",
    };

};
/* =========================================
   CANCEL SINGLE ITEM
   FIX: pass item._id as transactionId so
   walletService dedup works per-item, not
   per-order (multiple items on same order
   each get their own credit)
========================================= */
export const cancelOrderItemService = async (
    userId,
    orderId,
    itemId,
    reason
) => {

    const order = await Order.findOne({
        userId,
        orderId,
    });

    if (!order) {
        return {
            success: false,
            message: "Order not found",
        };
    }

    const item = order.items.id(itemId);

    if (!item) {
        return {
            success: false,
            message: "Item not found",
        };
    }

    if (
        item.itemStatus === "Cancelled" ||
        item.itemStatus === "Returned"
    ) {
        return {
            success: false,
            message: "Item already cancelled or returned",
        };
    }

    if (
        !["Pending", "Processing"].includes(order.orderStatus)
    ) {
        return {
            success: false,
            message: "Item can no longer be cancelled",
        };
    }

    /* Restore stock */
    await Variant.findByIdAndUpdate(
        item.variantId,
        {
            $inc: {
                stock: item.quantity,
            },
        }
    );

    const { refundAmount, message: couponMsg } = await revalidateCouponOnMutation(order, item, "cancelled");

    /* Refund only for prepaid orders */
    if (
        ["RAZORPAY", "WALLET"].includes(order.paymentMethod) &&
        !item.isRefundProcessed
    ) {

        if (refundAmount > 0) {

            await creditWallet({
                userId,
                amount: refundAmount,
                transactionType: "CancellationRefund",
                description:
                    `Refund for cancelled item [${item._id}] "${item.productName}" in order ${order.orderId}`,
                orderId: order._id,
                transactionId: String(item._id),
            });

            item.refundAmount = refundAmount;
            item.isRefundProcessed = true;
            order.refundAmount += refundAmount;
        }
    }

    item.itemStatus = "Cancelled";

    item.cancelReason =
        reason || "Item cancelled by customer";


    /* Entire order finished? */
    const allResolved = order.items.every(
        i =>
            ["Cancelled", "Returned"].includes(i.itemStatus)
    );

    if (allResolved) {

        order.orderStatus = "Cancelled";

        if (
            ["RAZORPAY", "WALLET"].includes(order.paymentMethod)
        ) {
            order.paymentStatus = "Refunded";
        }
    }

    await order.save();

    return {
            success: true,
            message:
                order.paymentMethod === "COD"
                    ? "Product cancelled successfully. " + (couponMsg ? couponMsg : "")
                    : "Product cancelled and refund credited to wallet. " + (couponMsg ? couponMsg : ""),
        };

};

/* =========================================
   RETURN FULL ORDER (request — admin approves)
   FIX: block resubmission after rejection
========================================= */
export const returnOrderService = async (
    userId,
    orderId,
    reason
) => {

    const order = await Order.findOne({
        userId,
        orderId,
    });

    if (!order) {
        return {
            success: false,
            message: "Order not found",
        };
    }

    if (order.orderStatus !== "Delivered") {
        return {
            success: false,
            message: "Only delivered orders can be returned",
        };
    }

    if (order.returnStatus === "Requested") {
        return {
            success: false,
            message: "Return request already submitted",
        };
    }

    if (order.returnStatus === "Approved") {
        return {
            success: false,
            message: "Order has already been returned",
        };
    }

if (order.returnStatus === "Rejected") {
    return {
        success: false,
        message:
            "Your return request was rejected. Please contact support.",
            
    };
}

    if (!reason?.trim()) {
        return {
            success: false,
            message: "Return reason required",
        };
    }

    order.returnStatus = "Requested";

    order.returnReason = reason.trim();

    /* Mark all eligible items */
    order.items.forEach(item => {

        if (
            item.itemStatus === "Delivered" &&
            item.itemReturnStatus === "None"
        ) {

            item.itemReturnStatus = "Requested";

            item.itemReturnReason = reason.trim();
        }

    });

    await order.save();

    return {
        success: true,
        message: "Return request sent successfully",
    };

};

/* =========================================
   RETURN SINGLE ITEM (request — admin approves)
   FIX: block resubmission after rejection
========================================= */
export const returnOrderItemService = async (
    userId,
    orderId,
    itemId,
    reason
) => {

    const order = await Order.findOne({
        userId,
        orderId,
    });

    if (!order) {
        return {
            success: false,
            message: "Order not found",
        };
    }

    const item = order.items.id(itemId);

    if (!item) {
        return {
            success: false,
            message: "Item not found",
        };
    }

    if (item.itemStatus !== "Delivered") {
        return {
            success: false,
            message: "Only delivered items can be returned",
        };
    }

    if (item.itemReturnStatus === "Requested") {
        return {
            success: false,
            message:
                "Return request already submitted for this item",
        };
    }

    if (item.itemReturnStatus === "Approved") {
        return {
            success: false,
            message:
                "This item has already been returned",
        };
    }
if (item.itemReturnStatus === "Rejected") {
    return {
        success: false,
        message:
            "Return request for this item was rejected. Please contact support.",
    };
}

    if (!reason?.trim()) {
        return {
            success: false,
            message: "Return reason required",
        };
    }

    item.itemReturnStatus = "Requested";

    item.itemReturnReason = reason.trim();

    /* Update order return status if needed */
    const hasPendingRequest =
        order.items.some(
            i =>
                i.itemReturnStatus === "Requested"
        );

    if (hasPendingRequest) {
        order.returnStatus = "Requested";
    }

    await order.save();

    return {
        success: true,
        message: "Return request sent successfully",
    };

};