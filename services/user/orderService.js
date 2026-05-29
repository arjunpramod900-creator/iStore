import Order from "../../models/Order.js";

import Variant from "../../models/Variant.js";

/* =========================================
   LOAD ORDERS
========================================= */

export const loadOrdersService = async ({
  userId,
  search = "",
  status = "",
  sort = "newest",
  page = 1,
  limit = 5,
}) => {

  const query = {
    userId,
  };

  /* 
     SEARCH
   */

  if (search.trim()) {

    query.$or = [

      {
        orderId: {
          $regex: search.trim(),
          $options: "i",
        },
      },

      {
        "items.productName": {
          $regex: search.trim(),
          $options: "i",
        },
      },

    ];
  }

  /* 
     STATUS FILTER
   */

  if (status.trim()) {

    query.orderStatus = {
      $regex: `^${status}$`,
      $options: "i",
    };
  }

  /* 
     SORTING
   */

  let sortOption = {
    createdAt: -1,
  };

  switch (sort) {

    case "oldest":

      sortOption = {
        createdAt: 1,
      };

      break;

    case "amount_high":

      sortOption = {
        finalAmount: -1,
      };

      break;

    case "amount_low":

      sortOption = {
        finalAmount: 1,
      };

      break;

    default:

      sortOption = {
        createdAt: -1,
      };
  }

  /* 
     PAGINATION
   */

  const currentPage =
  Math.max(
    Number(page) || 1,
    1
  );

  const skip =
    (currentPage - 1) * limit;

  const totalOrders =
    await Order.countDocuments(query);

  const totalPages =
  Math.max(
    Math.ceil(totalOrders / limit),
    1
  );

  const orders =
    await Order.find(query)

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

      hasNextPage:
        currentPage < totalPages,

      hasPrevPage:
        currentPage > 1,

    },

  };

};
/* =========================================
   LOAD ORDER DETAILS
========================================= */

export const loadOrderDetailsService =
async (
  userId,
  orderId,
) => {

  const order =
    await Order.findOne({
      userId,
      orderId,
    }).lean();

  if (!order) {
    return {
      success: false,
      message:
        "Order not found",
    };
  }

  return {
    success: true,
    order,
  };
};

/* =========================================
   CANCEL FULL ORDER
========================================= */

export const cancelOrderService =
async (
  userId,
  orderId,
  reason,
) => {

  const order =
    await Order.findOne({
      userId,
      orderId,
    });

  if (!order) {
    return {
      success: false,
      message:
        "Order not found",
    };
  }

  if (
    ![
    "Pending",
    "Processing",
    ].includes(
    order.orderStatus
    )
    )
    {
    return {
        success:false,
        message:
        "Order can no longer be cancelled",
    };
    } 

  /* UPDATE STOCK */

  for (const item of order.items) {

    const variant =
      await Variant.findById(
        item.variantId,
      );

    if (variant) {

      variant.stock +=
        item.quantity;

      await variant.save();
    }

    item.itemStatus =
      "Cancelled";
  }

  order.orderStatus =
    "Cancelled";

  order.cancelReason =
    reason || null;

  await order.save();

  return {
    success: true,
    message:
      "Order cancelled successfully",
  };
};

/* =========================================
   CANCEL SINGLE ITEM
========================================= */

export const cancelOrderItemService =
async (
  userId,
  orderId,
  itemId,
  reason,
) => {

  const order =
    await Order.findOne({
      userId,
      orderId,
    });
    

  if (!order) {
    return {
      success: false,
      message:
        "Order not found",
    };
  }

  /* FIND ITEM */

  const item =
    order.items.id(itemId);
   

  if (!item) {
    return {
      success: false,
      message:
        "Item not found",
    };
  }

  /* VALIDATIONS */

  if (
    [
      "Cancelled",
      "Returned",
    ].includes(item.itemStatus)
  ) {
    return {
      success: false,
      message:
        "Item already cancelled or returned",
    };
  }

  if (
![
  "Pending",
  "Processing",
].includes(
  order.orderStatus
)
)
{
  return {
    success:false,
    message:
    "Item can no longer be cancelled",
  };
} 

  /* RESTORE STOCK */

  const variant =
    await Variant.findById(
      item.variantId,
    );

  if (variant) {

    variant.stock +=
      item.quantity;

    await variant.save();
  }

  /* UPDATE ITEM */

  item.itemStatus =
    "Cancelled";

    /* =========================================
   RECALCULATE ORDER TOTALS
========================================= */
    const activeItems =
  order.items.filter(
    item =>
      item.itemStatus !==
      "Cancelled"
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

/* OPTIONAL TAX RECALCULATION */

const taxAmount =
  Math.round(
    newSubtotal * 0.18
  );

/* DELIVERY */

const deliveryCharge =
  newSubtotal > 50000
    ? 0
    : 99;

/* DISCOUNT */

const discountAmount =
  order.discountAmount || 0;

/* FINAL */

const finalAmount =
  (
    newSubtotal +
    taxAmount +
    deliveryCharge
  ) - discountAmount;

/* UPDATE ORDER */

order.subtotal =
  newSubtotal;

order.taxAmount =
  taxAmount;

order.deliveryCharge =
  deliveryCharge;

order.finalAmount =
  finalAmount;

  /* CHECK ORDER STATUS */

 if (
activeItems.length === 0
) {

order.orderStatus =
"Cancelled";
}

  order.cancelReason =
    reason || null;

  await order.save();

  return {
    success: true,
    message:
      "Product cancelled successfully",
  };
};

/* =========================================
   RETURN ORDER
========================================= */

export const returnOrderService =
async (
  userId,
  orderId,
  reason,
) => {

  const order =
    await Order.findOne({
      userId,
      orderId,
    });

  if (!order) {
    return {
      success: false,
      message:
        "Order not found",
    };
  }

  if (
    order.orderStatus !==
    "Delivered"
  ) {
    return {
      success: false,
      message:
        "Only delivered orders can be returned",
    };
  }

  if (!reason) {
    return {
      success: false,
      message:
        "Return reason required",
    };
  }

  order.orderStatus =
    "Returned";

  order.returnReason =
    reason;

  await order.save();

  return {
    success: true,
    message:
      "Return request submitted",
  };
};