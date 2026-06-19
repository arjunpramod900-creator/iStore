import {
  loadOrdersService,
  loadOrderDetailsService,
  cancelOrderService,
  cancelOrderItemService,
  returnOrderService,
  returnOrderItemService,
} from "../../services/user/orderService.js";

import {
  retryRazorpayPaymentService,
  loadRetryCheckoutService,
  retryOrderPaymentService,
} from "../../services/user/checkoutService.js";

import PDFDocument from "pdfkit";
import Order from "../../models/Order.js";

/* =========================================
   LOAD ORDERS PAGE
========================================= */
export const loadOrdersPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { search = "", status = "", sort = "newest", page = 1 } = req.query;

    const response = await loadOrdersService({ userId, search, status, sort, page });

    res.render("user/orders", {
      page:       "orders",
      orders:     response.orders,
      pagination: response.pagination,
      filters:    { search, status, sort },
    });
  } catch (error) {
    console.log("Load Orders Error:", error);
    return res.redirect("/");
  }
};

/* =========================================
   LOAD ORDER DETAILS
========================================= */
export const loadOrderDetailsPage = async (req, res) => {
  try {
    const userId      = req.session.userId;
    const { orderId } = req.params;

    const response = await loadOrderDetailsService(userId, orderId);
    if (!response.success) return res.redirect("/orders");

    res.render("user/order-details", {
      page:  "order-details",
      order: response.order,
    });
  } catch (error) {
    console.log("Load Order Details Error:", error);
    return res.redirect("/orders");
  }
};

/* =========================================
   CANCEL FULL ORDER
========================================= */
export const cancelOrder = async (req, res) => {
  try {
    const userId      = req.session.userId;
    const { orderId } = req.params;
    const { reason }  = req.body;

    const response = await cancelOrderService(userId, orderId, reason);
    return res.json(response);
  } catch (error) {
    console.log("Cancel Order Error:", error);
    return res.status(500).json({ success: false, message: "Cancellation failed" });
  }
};

/* =========================================
   CANCEL SINGLE ITEM
========================================= */
export const cancelOrderItem = async (req, res) => {
  try {
    const userId              = req.session.userId;
    const { orderId, itemId } = req.params;
    const { reason }          = req.body;

    const response = await cancelOrderItemService(userId, orderId, itemId, reason);
    return res.json(response);
  } catch (error) {
    console.log("Cancel Item Error:", error);
    return res.status(500).json({ success: false, message: "Item cancellation failed" });
  }
};

/* =========================================
   RETURN ORDER
========================================= */
export const returnOrder = async (req, res) => {
  try {
    const userId      = req.session.userId;
    const { orderId } = req.params;
    const { reason }  = req.body;

    const response = await returnOrderService(userId, orderId, reason);
    return res.json(response);
  } catch (error) {
    console.log("Return Order Error:", error);
    return res.status(500).json({ success: false, message: "Return request failed" });
  }
};

/* =========================================
   RETURN SINGLE ITEM
========================================= */
export const returnOrderItem = async (req, res) => {
  try {
    const userId              = req.session.userId;
    const { orderId, itemId } = req.params;
    const { reason }          = req.body;

    const response = await returnOrderItemService(userId, orderId, itemId, reason);
    return res.json(response);
  } catch (error) {
    console.log("Return Item Error:", error);
    return res.status(500).json({ success: false, message: "Item return request failed" });
  }
};

/* =========================================
   LOAD RETRY CHECKOUT PAGE
========================================= */
export const loadRetryCheckout = async (req, res) => {
  try {
    const userId      = req.session.userId;
    const { orderId } = req.params;

    const response = await loadRetryCheckoutService(userId, orderId);

    if (!response.success) {
      const msg = encodeURIComponent(response.message);
      return res.redirect(`/orders?retryError=${msg}`);
    }

    return res.render("user/retry-checkout", {
      page:        "orders",
      order:       response.order,
      addresses:   response.addresses,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.log("Load Retry Checkout Error:", error);
    return res.redirect("/orders");
  }
};

/* =========================================
   RETRY ORDER PAY
========================================= */
export const retryOrderPay = async (req, res) => {
  try {
    const userId                       = req.session.userId;
    const { orderId }                  = req.params;
    const { addressId, paymentMethod } = req.body;

    const response = await retryOrderPaymentService({
      userId,
      orderId,
      addressId,
      paymentMethod,
    });

    if (!response.success) {
      if (response.expired) {
        return res.json({
          success:     false,
          expired:     true,
          message:     response.message,
          redirectUrl: "/orders",
        });
      }
      return res.status(400).json({ success: false, message: response.message });
    }

    return res.json(response);
  } catch (error) {
    console.log("Retry Order Pay Error:", error);
    return res.status(500).json({ success: false, message: "Payment processing failed" });
  }
};

/* =========================================
   RETRY RAZORPAY PAYMENT (legacy)
========================================= */
export const retryPayment = async (req, res) => {
  try {
    const userId      = req.session.userId;
    const { orderId } = req.params;

    const response = await retryRazorpayPaymentService(userId, orderId);

    if (!response.success) {
      if (response.expired) {
        return res.json({
          success:     false,
          expired:     true,
          message:     response.message,
          redirectUrl: "/orders",
        });
      }
      return res.status(400).json({ success: false, message: response.message });
    }

    return res.json({
      success:       true,
      razorpayOrder: response.razorpayOrder,
      amount:        response.amount,
      orderId:       response.orderId,
    });
  } catch (error) {
    console.log("Retry Payment Error:", error);
    return res.status(500).json({ success: false, message: "Failed to retry payment" });
  }
};

/* =========================================
   HELPER — ORDER STATUS BADGE COLORS
   Returns { bg, text, label } for any status
========================================= */
const getOrderStatusStyle = (status) => {
  const map = {
    "Pending":           { bg: "#FFF6E5", text: "#E69A00", label: "Pending" },
    "Processing":        { bg: "#E8F0FF", text: "#2563EB", label: "Processing" },
    "Shipped":           { bg: "#EFF6FF", text: "#1D4ED8", label: "Shipped" },
    "Out for Delivery":  { bg: "#F0FDF4", text: "#16A34A", label: "Out for Delivery" },
    "Delivered":         { bg: "#E8F8EE", text: "#1F8A4D", label: "Delivered" },
    "Cancelled":         { bg: "#FFE8E8", text: "#D32F2F", label: "Cancelled" },
    "Returned":          { bg: "#F3E8FF", text: "#7E22CE", label: "Returned" },
  };
  return map[status] || { bg: "#F4F4F5", text: "#52525B", label: status };
};

/* =========================================
   HELPER — PAYMENT STATUS COLORS
========================================= */
const getPaymentStatusStyle = (status) => {
  const map = {
    "Paid":     { bg: "#E8F8EE", text: "#1F8A4D" },
    "Pending":  { bg: "#FFF6E5", text: "#E69A00" },
    "Failed":   { bg: "#FFE8E8", text: "#D32F2F" },
    "Refunded": { bg: "#F3E8FF", text: "#7E22CE" },
  };
  return map[status] || { bg: "#F4F4F5", text: "#52525B" };
};

/* =========================================
   DOWNLOAD INVOICE PDF
========================================= */
export const downloadInvoice = async (req, res) => {
  try {
    const userId      = req.session.userId;
    const { orderId } = req.params;

    const order = await Order.findOne({ userId, orderId }).lean();
    if (!order) return res.redirect("/orders");

const activeItems = order.items;

    /* ── Page height calculation ── */
    const MARGIN        = 50;
    const headerH       = 130;
    const infoCardsH    = 110;
    const shippingH     = 150;
    const itemsHeaderH  = 70;
    const itemRowH      = 45;
    const itemsH        = activeItems.length * itemRowH + 20;
    const summaryCardsH = 195;   /* slightly taller to fit order status row */
    const footerH       = 80;

    const totalHeight =
      MARGIN + headerH + infoCardsH + shippingH +
      itemsHeaderH + itemsH + summaryCardsH + footerH + MARGIN;

    const doc = new PDFDocument({
      margin:         0,
      size:           [612, totalHeight],
      autoFirstPage:  true,
      bufferPages:    true,
    });

    res.setHeader("Content-Type",        "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice-${order.orderId}.pdf`);
    doc.pipe(res);
    doc.addPage = () => {};

    /* ── HEADER ── */
    doc.fontSize(34).fillColor("#603763").font("Helvetica-Bold").text("iStore", 50, 50);
    doc.fontSize(12).fillColor("#666").font("Helvetica").text("Premium Apple Technology", 50, 90);
    doc.fontSize(24).fillColor("#1A1C1D").font("Helvetica-Bold").text("INVOICE", 400, 50);
    doc.fontSize(12).fillColor("#603763").font("Helvetica-Bold").text(`Invoice #${order.orderId}`, 400, 82);

    /* ── INFO CARDS (Customer + Order Details) ── */
    const startY = 140;

    /* Customer card */
    doc.rect(50, startY, 240, 105).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold").text("Customer", 65, startY + 15);
    doc.fillColor("#1A1C1D").fontSize(11).font("Helvetica")
      .text(order.shippingAddress?.fullName   || "", 65, startY + 40)
      .text(order.shippingAddress?.phoneNumber || "", 65, startY + 58)
      .text(
        `${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""}`,
        65, startY + 75
      );

    /* Order Details card */
    doc.rect(320, startY, 240, 105).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold").text("Order Details", 335, startY + 15);
    doc.fillColor("#1A1C1D").fontSize(11).font("Helvetica")
      .text(`Order: ${order.orderId}`, 335, startY + 40)
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, 335, startY + 58);

    /* Order status badge inside Order Details card */
    const orderStyle = getOrderStatusStyle(order.orderStatus);
    doc.roundedRect(335, startY + 76, 110, 20, 8)
       .fillAndStroke(orderStyle.bg, orderStyle.bg);
    doc.fillColor(orderStyle.text).fontSize(10).font("Helvetica-Bold")
       .text(orderStyle.label, 340, startY + 82, { width: 100, align: "center" });

    /* ── SHIPPING ADDRESS ── */
    const shippingY = 270;
    doc.roundedRect(50, shippingY, 510, 130, 12).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc.fillColor("#603763").fontSize(14).font("Helvetica-Bold")
       .text("Shipping Address", 65, shippingY + 15);
    doc.fillColor("#1A1C1D").fontSize(11).font("Helvetica")
       .text(order.shippingAddress?.fullName || "", 65, shippingY + 40);
    doc.moveTo(300, shippingY + 30).lineTo(300, shippingY + 110).strokeColor("#E6D7EC").stroke();
    doc
      .text(order.shippingAddress?.addressLine1 || "", 65,  shippingY + 58)
      .text(
        `${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""}`,
        65, shippingY + 76
      )
      .text(
        `${order.shippingAddress?.country || ""} - ${order.shippingAddress?.pincode || ""}`,
        65, shippingY + 94
      )
      .text(`Phone: ${order.shippingAddress?.phoneNumber || ""}`, 320, shippingY + 40);

    /* ── ITEMS HEADING ── */
    doc.fontSize(18).fillColor("#603763").font("Helvetica-Bold").text("Order Items", 240, 430);

    /* ── TABLE HEADER ── */
    const tableTop = 470;
    doc.rect(50, tableTop, 510, 28).fill("#3e037d");
    doc.fillColor("#FFFFFF").fontSize(11).font("Helvetica-Bold")
      .text("Product",  60,  tableTop + 8)
      .text("Status",   260, tableTop + 8)
      .text("Qty",      360, tableTop + 8)
      .text("Price",    410, tableTop + 8)
      .text("Total",    490, tableTop + 8);

    doc.rect(50, tableTop, 510, activeItems.length * itemRowH + 20)
       .strokeColor("#E6D7EC").stroke();

    /* ── TABLE ROWS ── */
    let y = tableTop + 35;

    activeItems.forEach((item, index) => {
      const rowTotal   = item.price * item.quantity;
      const itemStyle  = getOrderStatusStyle(item.itemStatus || order.orderStatus);

      if (index % 2 === 0) {
        doc.rect(50, y - 4, 510, itemRowH - 2).fill("#FBF8FC");
      }

      doc.fillColor("#1A1C1D").font("Helvetica").fontSize(10)
        /* Product name + variant */
        .text(item.productName, 60, y, { width: 180, ellipsis: true })
        .text(item.variantName || "", 60, y + 13, { width: 180, ellipsis: true });

      /* Item status badge */
      doc.roundedRect(258, y - 1, 90, 18, 7)
         .fillAndStroke(itemStyle.bg, itemStyle.bg);
      doc.fillColor(itemStyle.text).fontSize(9).font("Helvetica-Bold")
         .text(itemStyle.label, 260, y + 5, { width: 86, align: "center" });

      doc.fillColor("#1A1C1D").font("Helvetica").fontSize(10)
        .text(item.quantity.toString(),                       365, y)
        .text(`Rs.${item.price.toLocaleString("en-IN")}`,    410, y)
        .text(`Rs.${rowTotal.toLocaleString("en-IN")}`,      490, y);

      y += itemRowH;
    });

    /* ── SUMMARY CARDS ── */
    const summaryY = y + 30;

    /* Payment Information card — now includes Order Status row */
    doc.roundedRect(50, summaryY, 240, 170, 12).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold")
       .text("Payment Information", 65, summaryY + 15);

    /* Payment Method */
    doc.fillColor("#7A7A7A").fontSize(10).font("Helvetica")
       .text("Method", 65, summaryY + 48);
    doc.fillColor("#1A1C1D").fontSize(11).font("Helvetica-Bold")
       .text(order.paymentMethod, 160, summaryY + 47);

    /* Payment Status — colored badge */
    const payStyle = getPaymentStatusStyle(order.paymentStatus);
    doc.fillColor("#7A7A7A").fontSize(10).font("Helvetica")
       .text("Payment", 65, summaryY + 73);
    doc.roundedRect(155, summaryY + 70, 80, 17, 6)
       .fillAndStroke(payStyle.bg, payStyle.bg);
    doc.fillColor(payStyle.text).fontSize(9).font("Helvetica-Bold")
       .text(order.paymentStatus, 157, summaryY + 76, { width: 76, align: "center" });

    /* Order Status — colored badge */
    doc.fillColor("#7A7A7A").fontSize(10).font("Helvetica")
       .text("Order Status", 65, summaryY + 100);
    doc.roundedRect(155, summaryY + 97, 100, 17, 6)
       .fillAndStroke(orderStyle.bg, orderStyle.bg);
    doc.fillColor(orderStyle.text).fontSize(9).font("Helvetica-Bold")
       .text(orderStyle.label, 157, summaryY + 103, { width: 96, align: "center" });

    /* Order ID */
    doc.fillColor("#7A7A7A").fontSize(10).font("Helvetica")
       .text("Order ID", 65, summaryY + 128);
    doc.fillColor("#1A1C1D").fontSize(10).font("Helvetica")
       .text(order.orderId, 145, summaryY + 128, { width: 130 });

    /* Delivered date if available */
    if (order.deliveredDate) {
      doc.fillColor("#7A7A7A").fontSize(10).font("Helvetica")
         .text("Delivered", 65, summaryY + 148);
      doc.fillColor("#1A1C1D").fontSize(10).font("Helvetica")
         .text(
           new Date(order.deliveredDate).toLocaleDateString("en-IN"),
           145, summaryY + 148
         );
    }

    /* Payment Summary card */
    doc.roundedRect(320, summaryY, 240, 170, 12).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold")
       .text("Payment Summary", 335, summaryY + 15);

    const summaryRows = [
      { label: "Subtotal",  value: `Rs.${order.subtotal.toLocaleString("en-IN")}` },
      { label: "Tax",       value: `Rs.${order.taxAmount.toLocaleString("en-IN")}` },
      { label: "Shipping",  value: `Rs.${order.deliveryCharge.toLocaleString("en-IN")}` },
      { label: "Discount",  value: `Rs.${order.discountAmount.toLocaleString("en-IN")}` },
    ];

    summaryRows.forEach((row, i) => {
      const rowY = summaryY + 48 + i * 22;
      doc.fillColor("#7A7A7A").fontSize(10).font("Helvetica").text(row.label, 335, rowY);
      doc.fillColor("#1A1C1D").fontSize(10).font("Helvetica").text(row.value, 490, rowY);
    });

    /* Divider + Total */
    doc.moveTo(335, summaryY + 142).lineTo(548, summaryY + 142).strokeColor("#E6D7EC").stroke();
    doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold")
       .text("Total", 335, summaryY + 150)
       .text(`Rs.${order.finalAmount.toLocaleString("en-IN")}`, 450, summaryY + 150);

    /* ── FOOTER ── */
    const footerY = summaryY + 195;
    doc.moveTo(50, footerY).lineTo(560, footerY).strokeColor("#E6D7EC").stroke();
    doc.fontSize(11).fillColor("#7A7A7A").font("Helvetica")
       .text("Thank you for shopping with iStore.", 0, footerY + 15, { align: "center" });
    doc.fontSize(9).fillColor("#A0A0A0")
       .text("Order generated electronically by iStore", 0, footerY + 32, { align: "center" });

    doc.end();

  } catch (error) {
    console.log("Invoice Download Error:", error);
    return res.redirect("/orders");
  }
};