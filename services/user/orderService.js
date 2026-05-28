import Order from "../../models/Order.js";

import Variant from "../../models/Variant.js";

/* =========================================
   LOAD ORDERS
========================================= */

export const loadOrdersService =
async (userId) => {

  const orders =
    await Order.find({
      userId,
    })

      .sort({
        createdAt: -1,
      })

      .lean();

  return {
    success: true,
    orders,
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
    [
      "Delivered",
      "Cancelled",
      "Returned",
    ].includes(
      order.orderStatus,
    )
  ) {
    return {
      success: false,
      message:
        "Order cannot be cancelled",
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
    order.orderStatus ===
    "Delivered"
  ) {
    return {
      success: false,
      message:
        "Delivered items cannot be cancelled",
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