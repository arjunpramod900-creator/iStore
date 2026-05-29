import Order from "../../models/Order.js";
import User from "../../models/User.js";
import Variant from "../../models/Variant.js";


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

  const previousStatus =
    order.orderStatus;

  /* RESTORE STOCK */

 if (

  ["Cancelled", "Returned"].includes(status)

  &&

  !["Cancelled", "Returned"].includes(previousStatus)

) {

    for (
      const item
      of order.items
    ) {

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

  }

  order.orderStatus =
    status;

  if (
    status === "Delivered"
  ) {

    order.deliveredDate =
      new Date();

  }

  await order.save();

};