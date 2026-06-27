import Order from "../../models/Order.js";
import User from "../../models/User.js";
import Variant from "../../models/Variant.js";
import { creditWallet } from "../shared/walletService.js";
import {
    calculateFullOrderRefund,
} from "../shared/refundCalculator.js";
import { revalidateCouponOnMutation } from "../shared/couponRevalidationService.js";
import CouponUsage from "../../models/CouponUsage.js";
import Coupon from "../../models/Coupon.js";

/* ============================
   CONSTANTS
============================ */
const allowedStatuses = [
    "Pending", "Processing", "Shipped",
    "Out for Delivery", "Delivered", "Cancelled", "Returned",
];

/* ============================
   LOAD ORDERS
============================ */
export const loadOrdersService = async (query) => {

    const page   = Number(query.page) || 1;
    const limit  = 10;
    const skip   = (page - 1) * limit;
    const search = query.search || "";
    const status = query.status || "";
    const sort   = query.sort   || "newest";

    let filter = {};
    if (status === "Return Requested")     filter.returnStatus = "Requested";
    else if (status === "Return Approved") filter.returnStatus = "Approved";
    else if (status === "Return Rejected") filter.returnStatus = "Rejected";
    else if (status)                       filter.orderStatus  = status;

    if (search) {
        const users   = await User.find({ fullName: { $regex: search, $options: "i" } });
        const userIds = users.map(u => u._id);
        filter.$or = [
            { orderId:             { $regex: search, $options: "i" } },
            { userId:              { $in: userIds } },
            { "items.productName": { $regex: search, $options: "i" } },
        ];
    }

    let sortOption = { createdAt: -1 };
    switch (sort) {
        case "oldest":     sortOption = { createdAt: 1 };    break;
        case "amountHigh": sortOption = { finalAmount: -1 }; break;
        case "amountLow":  sortOption = { finalAmount: 1 };  break;
        default:           sortOption = { createdAt: -1 };
    }

    const orders = await Order.find(filter)
        .populate("userId",         "fullName email")
        .populate("items.productId")
        .populate("items.variantId")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean();

    const totalOrders = await Order.countDocuments(filter);

    const stats = {
        total:           await Order.countDocuments(),
        pending:         await Order.countDocuments({ orderStatus: "Pending" }),
        processing:      await Order.countDocuments({ orderStatus: "Processing" }),
        shipped:         await Order.countDocuments({ orderStatus: "Shipped" }),
        delivered:       await Order.countDocuments({ orderStatus: "Delivered" }),
        cancelled:       await Order.countDocuments({ orderStatus: "Cancelled" }),
        returned:        await Order.countDocuments({ orderStatus: "Returned" }),
        returnRequested: await Order.countDocuments({ returnStatus: "Requested" }),
        returnApproved:  await Order.countDocuments({ returnStatus: "Approved" }),
        returnRejected:  await Order.countDocuments({ returnStatus: "Rejected" }),
    };

    return {
        orders,
        stats,
        currentPage:  page,
        totalPages:   Math.max(1, Math.ceil(totalOrders / limit)),
        totalOrders,
        search,
        status,
        sort,
        limit,
    };
};

/* ============================
   ORDER DETAILS
============================ */
export const getOrderDetailsService = async (orderId) => {
    const order = await Order.findById(orderId)
        .populate("userId",         "fullName email")
        .populate("items.productId")
        .populate("items.variantId")
        .lean();
    if (!order) throw new Error("Order not found");
    return order;
};

/* ============================
   UPDATE STATUS
============================ */
export const updateOrderStatusService = async (
    orderId,
    status
) => {

    const order = await Order.findById(orderId);

    if (!order) {
        throw new Error("Order not found");
    }

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid status");
    }

    /* ==========================
       PAYMENT VALIDATION
    ========================== */
    if (
        order.paymentMethod === "RAZORPAY" &&
        order.paymentStatus !== "Paid"
    ) {
        if (status !== "Cancelled") {
            throw new Error(
                "Cannot update order status until payment is completed."
            );
        }
    }

    if (order.orderStatus === status) {
        throw new Error(
            `Order already marked as ${status}`
        );
    }

    const transitions = {
        Pending:          ["Processing", "Cancelled"],
        Processing:       ["Shipped",    "Cancelled"],
        Shipped:          ["Out for Delivery"],
        "Out for Delivery": ["Delivered"],
        Delivered:        [],
        Cancelled:        [],
        Returned:         [],
    };

    if (!transitions[order.orderStatus].includes(status)) {
        throw new Error(
            `Cannot move from ${order.orderStatus} to ${status}`
        );
    }

    /* ==========================
       ADMIN CANCEL
    ========================== */
    if (status === "Cancelled") {

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
                    filter: { _id: item.variantId },
                    update: { $inc: { stock: item.quantity } },
                },
            });

            item.itemStatus = "Cancelled";
        }

        if (bulkOperations.length > 0) {
            await Variant.bulkWrite(bulkOperations, { ordered: false });
        }

        /* Refund only once */
        if (
            ["RAZORPAY", "WALLET"].includes(order.paymentMethod) &&
            !order.isRefundProcessed
        ) {

            const { refundAmount } = calculateFullOrderRefund(order);

            if (refundAmount > 0) {

                await creditWallet({
                    userId: order.userId,
                    amount: refundAmount,
                    transactionType: "AdminCancellationRefund",
                    description: `Refund for admin-cancelled order ${order.orderId}`,
                    orderId: order._id,
                });

                order.refundAmount      += refundAmount;
                order.isRefundProcessed  = true;
                order.paymentStatus      = "Refunded";
            }
        }

        /* COD cancelled before delivery */
        if (order.paymentMethod === "COD") {
            order.paymentStatus = "Cancelled";
        }
    }

    order.orderStatus = status;

    for (const item of order.items) {
        if (!["Cancelled", "Returned"].includes(item.itemStatus)) {
            item.itemStatus = status;
        }
    }

    if (status === "Delivered") {
        order.deliveredDate = new Date();

        /* COD payment collected at delivery */
        if (order.paymentMethod === "COD") {
            order.paymentStatus = "Paid";
        }
    }

    await order.save();

};

/* ============================
   FULL ORDER RETURN — approve / reject
============================ */
export const handleReturnRequestService = async (
    orderId,
    action
) => {

    const order = await Order.findById(orderId);

    if (!order) {
        throw new Error("Order not found");
    }

    if (order.returnStatus !== "Requested") {
        throw new Error("No pending return request");
    }

    /* ==========================
       APPROVE RETURN
    ========================== */
    if (action === "approve") {

        order.returnStatus    = "Approved";
        order.returnApprovedAt = new Date();
        order.orderStatus     = "Returned";

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
                    filter: { _id: item.variantId },
                    update: { $inc: { stock: item.quantity } },
                },
            });

            item.itemStatus       = "Returned";
            item.itemReturnStatus = "Approved";
            item.returnApprovedAt = new Date();
        }

        if (bulkOperations.length > 0) {
            await Variant.bulkWrite(bulkOperations, { ordered: false });
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

        /* Refund only once */
        if (
            ["RAZORPAY", "WALLET"].includes(order.paymentMethod) &&
            !order.isRefundProcessed
        ) {

            const { refundAmount } = calculateFullOrderRefund(order);

            if (refundAmount > 0) {

                await creditWallet({
                    userId: order.userId,
                    amount: refundAmount,
                    transactionType: "ReturnRefund",
                    description: `Refund for returned order ${order.orderId}`,
                    orderId: order._id,
                });

                order.refundAmount      += refundAmount;
                order.isRefundProcessed  = true;
                order.paymentStatus      = "Refunded";
            }
        }

        /* COD already paid at delivery — mark refunded */
        if (order.paymentMethod === "COD") {
            order.paymentStatus     = "Refunded";

        }

        await order.save();

        return {
            success: true,
            message: "Return approved and refund credited to wallet",
        };
    }

    /* ==========================
       REJECT RETURN
    ========================== */
    if (action === "reject") {

        order.returnStatus = "Rejected";
        order.returnReason = null;

        for (const item of order.items) {
            if (item.itemReturnStatus === "Requested") {
                item.itemReturnStatus = "Rejected";
            }
        }

        /* Rejected return — customer keeps product, remains paid */
        if (order.paymentMethod === "COD" && order.deliveredDate) {
            order.paymentStatus = "Paid";
        }

        await order.save();

        return {
            success: true,
            message: "Return request rejected",
        };
    }

    throw new Error("Invalid action");

};

/* ============================
   SINGLE ITEM RETURN — approve / reject
============================ */
export const handleItemReturnRequestService = async (
    orderId,
    itemId,
    action
) => {

    const order = await Order.findById(orderId);

    if (!order) {
        throw new Error("Order not found");
    }

    const item = order.items.id(itemId);

    if (!item) {
        throw new Error("Item not found");
    }

    if (item.itemReturnStatus !== "Requested") {
        throw new Error("No pending return request for this item");
    }

    /* =================================
       APPROVE RETURN
    ================================= */
    if (action === "approve") {

        if (item.itemStatus === "Returned") {
            throw new Error("Item already returned");
        }

        /* Restore stock */
        await Variant.findByIdAndUpdate(
            item.variantId,
            { $inc: { stock: item.quantity } }
        );

        const { refundAmount, message: couponMsg } = await revalidateCouponOnMutation(order, item, "returned");

        /* Refund only once */
        if (
            ["RAZORPAY", "WALLET"].includes(order.paymentMethod) &&
            !item.isRefundProcessed
        ) {

            if (refundAmount > 0) {

                await creditWallet({
                    userId: order.userId,
                    amount: refundAmount,
                    transactionType: "ReturnRefund",
                    description: `Refund for returned item [${item._id}] "${item.productName}" in order ${order.orderId}`,
                    orderId: order._id,
                    transactionId: String(item._id),
                });

                item.refundAmount       = refundAmount;
                item.isRefundProcessed  = true;
                order.refundAmount     += refundAmount;
            }
        }

        item.itemStatus       = "Returned";
        item.itemReturnStatus = "Approved";
        item.returnApprovedAt = new Date();

        /*
         * NOTE: Invoice fields (subtotal, taxAmount, deliveryCharge,
         * couponDiscount, discountAmount, finalAmount) are intentionally
         * NOT modified here. The pricingSnapshot holds the permanent
         * financial record. Refunds are tracked via order.refundAmount
         * and item.refundAmount only.
         */

        /* Check if entire order is now resolved */
        const allResolved = order.items.every(
            i => ["Cancelled", "Returned"].includes(i.itemStatus)
        );

if (allResolved) {

    order.orderStatus = "Returned";
    order.returnStatus = "Approved";
    order.returnApprovedAt = new Date();

    if (order.paymentMethod === "COD") {
        order.paymentStatus = "Refunded";
    }

}

        await order.save();

        return {
            success: true,
            message: "Item return approved and refund credited to wallet. " + (couponMsg ? couponMsg : ""),
        };
    }

    /* =================================
       REJECT RETURN
    ================================= */
    if (action === "reject") {

        item.itemReturnStatus = "Rejected";

        if (order.paymentMethod === "COD" && order.deliveredDate) {
            order.paymentStatus = "Paid";
        }

        await order.save();

        return {
            success: true,
            message: "Item return request rejected",
        };
    }

    throw new Error("Invalid action");

};
