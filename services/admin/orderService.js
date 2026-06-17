import Order from "../../models/Order.js";
import User from "../../models/User.js";
import Variant from "../../models/Variant.js";
import { creditWallet } from "../shared/walletService.js";
import {
    calculateItemRefund,
    calculateFullOrderRefund,
    recalculateOrderTotals,
} from "../shared/refundCalculator.js";

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
export const updateOrderStatusService = async (orderId, status) => {

    const order = await Order.findById(orderId);
    if (!order)                              throw new Error("Order not found");
    if (!allowedStatuses.includes(status))   throw new Error("Invalid status");
    if (order.orderStatus === status)        throw new Error(`Order already marked as ${status}`);

    const transitions = {
        Pending:            ["Processing", "Cancelled"],
        Processing:         ["Shipped",    "Cancelled"],
        Shipped:            ["Out for Delivery"],
        "Out for Delivery": ["Delivered"],
        Delivered:          [],
        Cancelled:          [],
        Returned:           [],
    };

    if (!transitions[order.orderStatus].includes(status)) {
        throw new Error(`Cannot move from ${order.orderStatus} to ${status}`);
    }

    /* CANCEL from admin — restore stock + refund */
    if (status === "Cancelled") {
        for (const item of order.items) {
            if (["Cancelled","Returned"].includes(item.itemStatus)) continue;
            if (item.variantId) {
                await Variant.findByIdAndUpdate(item.variantId, { $inc: { stock: item.quantity } });
            }
        }

        if (
            ["RAZORPAY","WALLET"].includes(order.paymentMethod) &&
            !order.isRefundProcessed
        ) {
            const { refundAmount } = calculateFullOrderRefund(order);

            await creditWallet({
                userId:          order.userId,
                amount:          refundAmount,
                transactionType: "AdminCancellationRefund",
                description:     `Refund for admin-cancelled order ${order.orderId}`,
                orderId:         order._id,
            });

            order.refundAmount      = refundAmount;
            order.isRefundProcessed = true;
            order.paymentStatus     = "Refunded";
        }
    }

    order.orderStatus = status;

    for (const item of order.items) {
        if (!["Cancelled","Returned"].includes(item.itemStatus)) {
            item.itemStatus = status;
        }
    }

    if (status === "Delivered") order.deliveredDate = new Date();

    await order.save();
};

/* ============================
   FULL ORDER RETURN — approve / reject
============================ */
export const handleReturnRequestService = async (orderId, action) => {

    const order = await Order.findById(orderId);
    if (!order)                          throw new Error("Order not found");
    if (order.returnStatus !== "Requested") throw new Error("No pending return request");

    /* ── APPROVE ── */
    if (action === "approve") {

        order.returnStatus     = "Approved";
        order.returnApprovedAt = new Date();
        order.orderStatus      = "Returned";
        order.paymentStatus    = "Refunded";

        /* REFUND — full order: refund exactly what they paid */
        if (!order.isRefundProcessed) {
            const { refundAmount } = calculateFullOrderRefund(order);

            await creditWallet({
                userId:          order.userId,
                amount:          refundAmount,
                transactionType: "ReturnRefund",
                description:     `Refund for returned order ${order.orderId}`,
                orderId:         order._id,
            });

            order.refundAmount      = refundAmount;
            order.isRefundProcessed = true;
        }

        /* RESTORE STOCK */
        for (const item of order.items) {
            if (item.itemStatus === "Cancelled") continue;
            const variant = await Variant.findById(item.variantId);
            if (variant) { variant.stock += item.quantity; await variant.save(); }
            item.itemStatus = "Returned";
        }

        /* RECALCULATE TOTALS (all items now returned — will result in 0) */
        const activeItems   = order.items.filter(i => !["Cancelled","Returned"].includes(i.itemStatus));
        const updatedTotals = recalculateOrderTotals(order, activeItems);
        order.subtotal       = updatedTotals.subtotal;
        order.taxAmount      = updatedTotals.taxAmount;
        order.deliveryCharge = updatedTotals.deliveryCharge;
        order.couponDiscount = updatedTotals.couponDiscount;
        order.discountAmount = updatedTotals.discountAmount;
        order.finalAmount    = updatedTotals.finalAmount;

        await order.save();
        return { success: true, message: "Return approved and refund credited to wallet" };
    }

    /* ── REJECT ── */
    if (action === "reject") {
        order.returnStatus = "Rejected";
        order.returnReason = null;
        await order.save();
        return { success: true, message: "Return request rejected" };
    }

    throw new Error("Invalid action");
};

/* ============================
   SINGLE ITEM RETURN — approve / reject
============================ */
export const handleItemReturnRequestService = async (orderId, itemId, action) => {

    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");

    const item = order.items.id(itemId);
    if (!item)  throw new Error("Item not found");

    if (item.itemReturnStatus !== "Requested") {
        throw new Error("No pending return request for this item");
    }

    /* ── APPROVE ── */
    if (action === "approve") {

        /* RESTORE STOCK */
        const variant = await Variant.findById(item.variantId);
        if (variant) {
            variant.stock += item.quantity;
            await variant.save();
        }

        /* REFUND — proportional item refund using shared calculator */
        if (["RAZORPAY","WALLET"].includes(order.paymentMethod)) {
            const { refundAmount } = calculateItemRefund(order, item);

            await creditWallet({
                userId:          order.userId,
                amount:          refundAmount,
                transactionType: "ReturnRefund",
                description:     `Refund for returned item "${item.productName}" in order ${order.orderId}`,
                orderId:         order._id,
            });
        }

        /* UPDATE ITEM */
        item.itemStatus       = "Returned";
        item.itemReturnStatus = "Approved";

        /* RECALCULATE ORDER TOTALS */
        const activeItems   = order.items.filter(i => !["Cancelled","Returned"].includes(i.itemStatus));
        const updatedTotals = recalculateOrderTotals(order, activeItems);
        order.subtotal       = updatedTotals.subtotal;
        order.taxAmount      = updatedTotals.taxAmount;
        order.deliveryCharge = updatedTotals.deliveryCharge;
        order.couponDiscount = updatedTotals.couponDiscount;
        order.discountAmount = updatedTotals.discountAmount;
        order.finalAmount    = updatedTotals.finalAmount;

        /* If every item is now resolved, mark whole order as Returned */
        const allResolved = order.items.every(i => ["Cancelled","Returned"].includes(i.itemStatus));
        if (allResolved) {
            order.orderStatus      = "Returned";
            order.returnStatus     = "Approved";
            order.returnApprovedAt = new Date();
            order.paymentStatus    = "Refunded";
        }

        await order.save();
        return { success: true, message: "Item return approved and refund credited to wallet" };
    }

    /* ── REJECT ── */
    if (action === "reject") {
        item.itemReturnStatus = "Rejected";
        await order.save();
        return { success: true, message: "Item return request rejected" };
    }

    throw new Error("Invalid action");
};