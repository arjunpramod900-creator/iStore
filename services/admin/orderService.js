import Order from "../../models/Order.js";
import User from "../../models/User.js";
import Variant from "../../models/Variant.js";
import {
  creditWallet,
} from "../shared/walletService.js";


/* ============================

   CONSTANTS

============================ */

const allowedStatuses = [

  "Pending",

  "Processing",

  "Shipped",

  "Out for Delivery",

  "Delivered",

  "Cancelled",

  "Returned",

];

/* ============================
   LOAD ORDERS
============================ */

export const loadOrdersService = async (query) => {

  const page =
    Number(query.page) || 1;

  const limit = 10;

  const skip =
    (page - 1) * limit;

  const search =
  query.search || "";

    const status =
    query.status || "";

    const sort =
    query.sort || "newest";

  let filter = {};

  if (status) {

    filter.orderStatus = status;

  }

  if (search) {

  const users =
    await User.find({

      fullName: {
        $regex: search,
        $options: "i",
      },

    });

  const userIds =
    users.map(
      user => user._id
    );

  filter.$or = [

    {
      orderId: {
        $regex: search,
        $options: "i",
      },
    },

    {
      userId: {
        $in: userIds,
      },
    },

    {
      "items.productName": {
        $regex: search,
        $options: "i",
      },
    },

  ];

}
let sortOption = {
  createdAt: -1
};

switch (sort) {

  case "oldest":

    sortOption = {
      createdAt: 1
    };

    break;

  case "amountHigh":

    sortOption = {
      finalAmount: -1
    };

    break;

  case "amountLow":

    sortOption = {
      finalAmount: 1
    };

    break;

  default:

    sortOption = {
      createdAt: -1
    };

}

  const orders =
    await Order.find(filter)

      .populate(
  "userId",
  "fullName email"
)
.populate(
  "items.productId"
)
.populate(
  "items.variantId"
)

      .sort(sortOption)

      .skip(skip)

      .limit(limit)

      .lean();

  const totalOrders =
    await Order.countDocuments(
      filter
    );

const stats = {

  total: await Order.countDocuments(),

  pending: await Order.countDocuments({
      orderStatus: "Pending",
  }),

  processing: await Order.countDocuments({
      orderStatus: "Processing",
  }),

  shipped: await Order.countDocuments({
      orderStatus: "Shipped",
  }),

  delivered: await Order.countDocuments({
      orderStatus: "Delivered",
  }),

  cancelled: await Order.countDocuments({
      orderStatus: "Cancelled",
  }),

  returned: await Order.countDocuments({
      orderStatus: "Returned",
  }),

};

  return {

    orders,

    stats,

    currentPage: page,

    totalPages: Math.max(
        1,
        Math.ceil(totalOrders / limit)
        ),

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

export const getOrderDetailsService =
async (orderId) => {

  const order =
    await Order.findById(orderId)

     .populate(
  "userId",
  "fullName email"
)
.populate(
  "items.productId"
)
.populate(
  "items.variantId"
)

      .lean();

  if (!order) {

    throw new Error(
      "Order not found"
    );

  }

  return order;

};

/* ============================
   UPDATE STATUS
============================ */

export const updateOrderStatusService =
async (
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

if (order.orderStatus === status) {
  throw new Error(
    `Order already marked as ${status}`
  );
}
/* STATUS TRANSITIONS */
const transitions = {

  Pending: [
    "Processing",
    "Cancelled"
  ],

  Processing: [
    "Shipped",
    "Cancelled"
  ],

  Shipped: [
    "Out for Delivery"
  ],

  "Out for Delivery": [
    "Delivered"
  ],

  Delivered: [],

  Cancelled: [],

  Returned: []

};

const currentStatus =
order.orderStatus;

if (
!transitions[currentStatus]
.includes(status)
){
  throw new Error(
    `Cannot move from ${currentStatus} to ${status}`
  );
}

  const previousStatus =
    order.orderStatus;

  /* RESTORE STOCK */

 if (

  status === "Cancelled"

  &&

  !["Cancelled", "Returned"].includes(previousStatus)

) {

  for (const item of order.items) {

    if (item.variantId) {

      await Variant.findByIdAndUpdate(

        item.variantId,

        {

          $inc: {

            stock: item.quantity,

          },

        }

      );

    }

  }

  /* ==========================
     REFUND PREPAID ORDERS
  ========================== */

  if (

    ["RAZORPAY", "WALLET"]
    .includes(order.paymentMethod)

    &&

    !order.isRefundProcessed

  ) {

    await creditWallet({

      userId:
        order.userId,

      amount:
        order.finalAmount,

      transactionType:
        "AdminCancellationRefund",

      description:
        `Refund for cancelled order ${order.orderId}`,

      orderId:
        order._id,

    });

    order.refundAmount =
      order.finalAmount;

    order.isRefundProcessed =
      true;

    order.paymentStatus =
      "Refunded";

  }

}


  order.orderStatus =
    status;
    for (const item of order.items) {

  if (
    item.itemStatus !== "Cancelled" &&
    item.itemStatus !== "Returned"
  ) {

    item.itemStatus = status;

  }

}

  if (
    status === "Delivered"
  ) {

    order.deliveredDate =
      new Date();

  }

  await order.save();

};

/* ============================
   RETURN REQUEST
============================ */
export const handleReturnRequestService =
async (
  orderId,
  action
) => {

  const order =
  await Order.findById(orderId);

  if (!order) {

    throw new Error(
      "Order not found"
    );

  }

  if (
    order.returnStatus !==
    "Requested"
  ) {

    throw new Error(
      "No pending return request"
    );

  }

  /* ==========================
     APPROVE RETURN
  ========================== */

  if (
    action === "approve"
  ) {

    order.returnStatus =
      "Approved";

    order.returnApprovedAt =
      new Date();

    order.orderStatus =
      "Returned";

    order.paymentStatus =
      "Refunded";

  /* ==========================
   WALLET REFUND
========================== */

if (
  !order.isRefundProcessed
) {

  await creditWallet({

    userId:
      order.userId,

    amount:
      order.finalAmount,

    transactionType:
      "ReturnRefund",

    description:
      `Refund for returned order ${order.orderId}`,

    orderId:
      order._id,

  });

  order.refundAmount =
    order.finalAmount;

  order.isRefundProcessed =
    true;

}

    /* RESTORE STOCK */

for (const item of order.items) {

  if (
    item.itemStatus === "Cancelled"
  ) {
    continue;
  }

  const variant =
    await Variant.findById(
      item.variantId
    );

  if (variant) {

    variant.stock += item.quantity;

    await variant.save();
  }

  item.itemStatus =
    "Returned";
}

const activeItems =
order.items.filter(
  item =>
    ![
      "Cancelled",
      "Returned"
    ].includes(
      item.itemStatus
    )
);

const newSubtotal =
activeItems.reduce(
  (total, item) =>
    total +
    (
      item.price *
      item.quantity
    ),
  0
);

const taxAmount =
Math.floor(
  newSubtotal * 0.02
);

const deliveryCharge =
newSubtotal >= 5000
? 0
: 99;

const finalAmount =
newSubtotal +
taxAmount +
deliveryCharge -
(order.discountAmount || 0);

order.subtotal =
newSubtotal;

order.taxAmount =
taxAmount;

order.deliveryCharge =
deliveryCharge;

order.finalAmount =
finalAmount;

    await order.save();

    return {
      success: true,
      message:
      "Return approved successfully",
    };

  }

  /* ==========================
     REJECT RETURN
  ========================== */

  if (
    action === "reject"
  ) {

    order.returnStatus =
      "Rejected";

    order.returnReason =
      null;

    await order.save();

    return {
      success: true,
      message:
      "Return request rejected",
    };

  }

  throw new Error(
    "Invalid action"
  );

};