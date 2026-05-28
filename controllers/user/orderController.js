import {
  loadOrdersService,
  loadOrderDetailsService,
  cancelOrderService,
  cancelOrderItemService,
  returnOrderService,
} from "../../services/user/orderService.js";

import PDFDocument from "pdfkit";

import Order from "../../models/Order.js";

/* =========================================
   LOAD ORDERS PAGE
========================================= */

export const loadOrdersPage = async (
  req,
  res,
) => {
  try {
    const userId =
      req.session.userId;

    const response =
      await loadOrdersService(
        userId,
      );

    res.render(
      "user/orders",
      {
        page: "orders",

        orders:
          response.orders,
      },
    );
  } catch (error) {
    console.log(
      "Load Orders Error:",
      error,
    );

    return res.redirect("/");
  }
};

/* =========================================
   LOAD ORDER DETAILS
========================================= */

export const loadOrderDetailsPage =
async (
  req,
  res,
) => {
  try {
    const userId =
      req.session.userId;

    const { orderId } =
      req.params;

    const response =
      await loadOrderDetailsService(
        userId,
        orderId,
      );

    if (!response.success) {
      return res.redirect(
        "/orders",
      );
    }

    res.render(
      "user/order-details",
      {
        page:
          "order-details",

        order:
          response.order,
      },
    );
  } catch (error) {
    console.log(
      "Load Order Details Error:",
      error,
    );

    return res.redirect(
      "/orders",
    );
  }
};

/* =========================================
   CANCEL FULL ORDER
========================================= */

export const cancelOrder =
async (
  req,
  res,
) => {
  try {
    const userId =
      req.session.userId;

    const { orderId } =
      req.params;

    const {
      reason,
    } = req.body;

    const response =
      await cancelOrderService(
        userId,
        orderId,
        reason,
      );

    return res.json(
      response,
    );
  } catch (error) {
    console.log(
      "Cancel Order Error:",
      error,
    );

    return res.status(500)
      .json({
        success: false,
        message:
          "Cancellation failed",
      });
  }
};

/* =========================================
   CANCEL SINGLE ITEM
========================================= */

export const cancelOrderItem =
async (
  req,
  res,
) => {
  try {
    const userId =
      req.session.userId;

    const {
      orderId,
      itemId,
    } = req.params;

    const {
      reason,
    } = req.body;

    const response =
      await cancelOrderItemService(
        userId,
        orderId,
        itemId,
        reason,
      );

    return res.json(
      response,
    );
  } catch (error) {
    console.log(
      "Cancel Item Error:",
      error,
    );

    return res.status(500)
      .json({
        success: false,
        message:
          "Item cancellation failed",
      });
  }
};

/* =========================================
   RETURN ORDER
========================================= */

export const returnOrder =
async (
  req,
  res,
) => {
  try {
    const userId =
      req.session.userId;

    const { orderId } =
      req.params;

    const {
      reason,
    } = req.body;

    const response =
      await returnOrderService(
        userId,
        orderId,
        reason,
      );

    return res.json(
      response,
    );
  } catch (error) {
    console.log(
      "Return Order Error:",
      error,
    );

    return res.status(500)
      .json({
        success: false,
        message:
          "Return request failed",
      });
  }
};


/* =========================================
DOWNLOAD INVOICE PDF
========================================= */

export const downloadInvoice =
async (
req,
res,
) => {

try {
    const userId =
  req.session.userId;

const { orderId } =
  req.params;

const order =
  await Order.findOne({
    userId,
    orderId,
  }).lean();

if (!order) {

  return res.redirect(
    "/orders",
  );
}

/* PDF INIT */

const doc =
  new PDFDocument({
    margin: 50,
  });

/* RESPONSE HEADERS */

res.setHeader(
  "Content-Type",
  "application/pdf",
);

res.setHeader(
  "Content-Disposition",
  `attachment; filename=Invoice-${order.orderId}.pdf`,
);

doc.pipe(res);

/* 
   HEADER
 */

doc
  .fontSize(28)
  .fillColor("#4C0080")
  .text(
    "iStore Invoice",
    {
      align: "center",
    },
  );

doc.moveDown(1);

/* 
   ORDER INFO
 */

doc
  .fontSize(14)
  .fillColor("#000");

doc.text(
  `Order ID: ${order.orderId}`,
);

doc.text(
  `Order Date: ${new Date(
    order.createdAt
  ).toLocaleDateString("en-IN")}`,
);

doc.text(
  `Order Status: ${order.orderStatus}`,
);

doc.moveDown(1);

/* 
   SHIPPING ADDRESS
 */

doc
  .fontSize(18)
  .fillColor("#4C0080")
  .text("Shipping Address");

doc.moveDown(0.5);

doc
  .fontSize(13)
  .fillColor("#000");

doc.text(
  order.shippingAddress
    ?.fullName || "",
);

doc.text(
  order.shippingAddress
    ?.addressLine1 || "",
);

doc.text(
  `${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""}`,
);

doc.text(
  `${order.shippingAddress?.country || ""} - ${order.shippingAddress?.pincode || ""}`,
);

doc.text(
  `Phone: ${order.shippingAddress?.phoneNumber || ""}`,
);

doc.moveDown(1.5);

/* 
   ITEMS TABLE
 */

doc
  .fontSize(18)
  .fillColor("#4C0080")
  .text("Order Items");

doc.moveDown(0.7);

order.items.forEach(
  (
    item,
    index,
  ) => {

    const itemTotal =
      item.price *
      item.quantity;

    doc
      .fontSize(13)
      .fillColor("#000");

    doc.text(
      `${index + 1}. ${item.productName}`,
    );

    doc.text(
      `Variant: ${item.variantName}`,
    );

    doc.text(
      `Quantity: ${item.quantity}`,
    );

    doc.text(
      `Price: ₹${item.price}`,
    );

    doc.text(
      `Total: ₹${itemTotal}`,
    );

    doc.text(
      `Status: ${item.itemStatus}`,
    );

    doc.moveDown(1);
  },
);

/* 
   PAYMENT SUMMARY
 */

doc.moveDown(1);

doc
  .fontSize(18)
  .fillColor("#4C0080")
  .text("Payment Summary");

doc.moveDown(0.7);

doc
  .fontSize(13)
  .fillColor("#000");

doc.text(
  `Subtotal: ₹${order.subtotal}`,
);

doc.text(
  `Tax: ₹${order.taxAmount}`,
);

doc.text(
  `Delivery Charge: ₹${order.deliveryCharge}`,
);

doc.text(
  `Discount: ₹${order.discountAmount}`,
);

doc.moveDown(0.5);

doc
  .fontSize(16)
  .fillColor("#4C0080")
  .text(
    `Final Amount: ₹${order.finalAmount}`,
  );

doc.moveDown(1);

/* 
   PAYMENT INFO
 */

doc
  .fontSize(18)
  .fillColor("#4C0080")
  .text("Payment Information");

doc.moveDown(0.5);

doc
  .fontSize(13)
  .fillColor("#000");

doc.text(
  `Payment Method: ${order.paymentMethod}`,
);

doc.text(
  `Payment Status: ${order.paymentStatus}`,
);

doc.moveDown(2);

/* 
   FOOTER
 */

doc
  .fontSize(12)
  .fillColor("gray")
  .text(
    "Thank you for shopping with iStore.",
    {
      align: "center",
    },
  );

doc.end();


} catch (error) {
    console.log(
  "Invoice Download Error:",
  error,
);

return res.redirect(
  "/orders",
);
}
};