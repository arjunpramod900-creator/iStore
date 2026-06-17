import {
  loadOrdersService,
  loadOrderDetailsService,
  cancelOrderService,
  cancelOrderItemService,
  returnOrderService,
  returnOrderItemService,
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

    const {
      search = "",
      status = "",
      sort = "newest",
      page = 1,
    } = req.query;

    const response =
      await loadOrdersService({

        userId,

        search,

        status,

        sort,

        page,

      });

    res.render(
      "user/orders",
      {

        page: "orders",

        orders:
          response.orders,

        pagination:
          response.pagination,

        filters: {

          search,

          status,

          sort,

        },

      }
    );

  }

  catch (error) {

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
   RETURN SINGLE ITEM
========================================= */

export const returnOrderItem = async (
  req,
  res,
) => {
  try {
    const userId = req.session.userId;

    const { orderId, itemId } = req.params;

    const { reason } = req.body;

    const response = await returnOrderItemService(
      userId,
      orderId,
      itemId,
      reason,
    );

    return res.json(response);
  } catch (error) {
    console.log("Return Item Error:", error);

    return res.status(500).json({
      success: false,
      message: "Item return request failed",
    });
  }
};


/* =========================================
DOWNLOAD INVOICE PDF
========================================= */

export const downloadInvoice = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { orderId } = req.params;

    const order = await Order.findOne({ userId, orderId }).lean();

    if (!order) {
      return res.redirect("/orders");
    }

    /* =========================================
       FILTER OUT CANCELLED ITEMS
    ========================================= */

    const activeItems = order.items.filter(
      (item) => item.itemStatus !== "Cancelled"
    );

    /* =========================================
       PRE-CALCULATE TOTAL PAGE HEIGHT
    ========================================= */

    const MARGIN = 50;
    const headerH = 130;
    const infoCardsH = 110;
    const shippingH = 150;
    const itemsHeaderH = 70;
    const itemRowH = 40;
    const itemsH = activeItems.length * itemRowH + 20; // <-- uses activeItems count
    const summaryCardsH = 175;
    const footerH = 80;

    const totalHeight =
      MARGIN +
      headerH +
      infoCardsH +
      shippingH +
      itemsHeaderH +
      itemsH +
      summaryCardsH +
      footerH +
      MARGIN;

    /* PDF INIT — dynamic height */
    const doc = new PDFDocument({
      margin: 0,
      size: [612, totalHeight],
      autoFirstPage: true,
      bufferPages: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Invoice-${order.orderId}.pdf`
    );

    doc.pipe(res);
    doc.addPage = () => {};

    /* =========================================
       HEADER
    ========================================= */

    doc
      .fontSize(34)
      .fillColor("#603763")
      .font("Helvetica-Bold")
      .text("iStore", 50, 50);

    doc
      .fontSize(12)
      .fillColor("#666")
      .font("Helvetica")
      .text("Premium Apple Technology", 50, 90);

    doc
      .fontSize(24)
      .fillColor("#1A1C1D")
      .font("Helvetica-Bold")
      .text("INVOICE", 400, 50);

    doc
      .fontSize(12)
      .fillColor("#603763")
      .font("Helvetica-Bold")
      .text(`Invoice #${order.orderId}`, 400, 82);

    /* =========================================
       CUSTOMER + ORDER INFO CARDS
    ========================================= */

    const startY = 140;

    /* CUSTOMER CARD */
    doc.rect(50, startY, 240, 105).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc
      .fillColor("#603763")
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("Customer", 65, startY + 15);
    doc
      .fillColor("#1A1C1D")
      .fontSize(11)
      .font("Helvetica")
      .text(order.shippingAddress?.fullName || "", 65, startY + 40);
    doc.text(order.shippingAddress?.phoneNumber || "", 65, startY + 58);
    doc.text(
      `${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""}`,
      65,
      startY + 75
    );

    /* ORDER CARD */
    doc.rect(320, startY, 240, 105).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc
      .fillColor("#603763")
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("Order Details", 335, startY + 15);
    doc
      .fillColor("#1A1C1D")
      .fontSize(11)
      .font("Helvetica")
      .text(`Order: ${order.orderId}`, 335, startY + 40);
    doc.text(
      `Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`,
      335,
      startY + 58
    );

    /* STATUS BADGE */
    let badgeBg = "#E8F8EE";
    let badgeText = "#1F8A4D";
    if (order.orderStatus === "Cancelled") {
      badgeBg = "#FFE8E8";
      badgeText = "#D32F2F";
    }
    if (order.orderStatus === "Pending") {
      badgeBg = "#FFF6E5";
      badgeText = "#E69A00";
    }

    doc
      .roundedRect(335, startY + 68, 90, 22, 10)
      .fillAndStroke(badgeBg, badgeBg);
    doc
      .fillColor(badgeText)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(order.orderStatus, 355, startY + 75);

    /* =========================================
       SHIPPING ADDRESS CARD
    ========================================= */

    const shippingY = 270;

    doc
      .roundedRect(50, shippingY, 510, 130, 12)
      .fillAndStroke("#FBF8FC", "#E6D7EC");

    doc
      .fillColor("#603763")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Shipping Address", 65, shippingY + 15);

    doc
      .fillColor("#1A1C1D")
      .fontSize(11)
      .font("Helvetica")
      .text(order.shippingAddress?.fullName || "", 65, shippingY + 40);

    doc
      .moveTo(300, shippingY + 30)
      .lineTo(300, shippingY + 110)
      .strokeColor("#E6D7EC")
      .stroke();

    doc.text(order.shippingAddress?.addressLine1 || "", 65, shippingY + 58);
    doc.text(
      `${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""}`,
      65,
      shippingY + 76
    );
    doc.text(
      `${order.shippingAddress?.country || ""} - ${order.shippingAddress?.pincode || ""}`,
      65,
      shippingY + 94
    );
    doc.text(
      `Phone: ${order.shippingAddress?.phoneNumber || ""}`,
      320,
      shippingY + 40
    );

    /* =========================================
       ORDER ITEMS TABLE
    ========================================= */

    doc
      .fontSize(18)
      .fillColor("#603763")
      .font("Helvetica-Bold")
      .text("Order Items", 240, 430);

    const tableTop = 470;

    /* TABLE HEADER */
    doc.rect(50, tableTop, 510, 28).fill("#3e037d");

    doc
      .fillColor("#FFFFFF")
      .fontSize(11)
      .font("Helvetica-Bold");

    doc.text("Product", 60, tableTop + 8);
    doc.text("Qty", 300, tableTop + 8);
    doc.text("Price", 360, tableTop + 8);
    doc.text("Total", 450, tableTop + 8);

    /* TABLE BORDER — uses activeItems count */
    doc
      .rect(50, tableTop, 510, activeItems.length * 40 + 20)
      .strokeColor("#E6D7EC")
      .stroke();

    let y = tableTop + 35;

    /* Loop over activeItems only — cancelled items simply don't appear */
    activeItems.forEach((item, index) => {
      const total = item.price * item.quantity;

      if (index % 2 === 0) {
        doc.rect(50, y - 4, 510, 24).fill("#FBF8FC");
      }

      doc.fillColor("#1A1C1D").font("Helvetica").fontSize(10);

      doc.text(item.productName, 60, y, { width: 150, ellipsis: true });
      doc.text(item.variantName || "", 60, y + 12, {
        width: 150,
        ellipsis: true,
      });
      doc.text(item.quantity.toString(), 300, y);
      doc.text(`₹${item.price.toLocaleString("en-IN")}`, 360, y);
      doc.text(`₹${total.toLocaleString("en-IN")}`, 450, y);

      y += 40;
    });

    /* =========================================
       PAYMENT SUMMARY + PAYMENT INFO CARDS
    ========================================= */

    const summaryY = y + 30;

    /* PAYMENT SUMMARY CARD */
    doc
      .roundedRect(320, summaryY, 240, 145, 12)
      .fillAndStroke("#FBF8FC", "#E6D7EC");

    doc
      .fillColor("#603763")
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("Payment Summary", 335, summaryY + 15);

    doc.fillColor("#1A1C1D").fontSize(11).font("Helvetica");

    doc.text("Subtotal", 335, summaryY + 40);
    doc.text(`₹${order.subtotal.toLocaleString("en-IN")}`, 490, summaryY + 40);

    doc.text("Tax", 335, summaryY + 60);
    doc.text(`₹${order.taxAmount.toLocaleString("en-IN")}`, 490, summaryY + 60);

    doc.text("Shipping", 335, summaryY + 80);
    doc.text(
      `₹${order.deliveryCharge.toLocaleString("en-IN")}`,
      490,
      summaryY + 80
    );

    doc.text("Discount", 335, summaryY + 100);
    doc.text(
      `₹${order.discountAmount.toLocaleString("en-IN")}`,
      490,
      summaryY + 100
    );

    doc.font("Helvetica-Bold").fillColor("#603763");
    doc.text("Total", 335, summaryY + 125);
    doc.text(
      `₹${order.finalAmount.toLocaleString("en-IN")}`,
      470,
      summaryY + 125
    );

    /* PAYMENT INFO CARD */
    doc
      .roundedRect(50, summaryY, 240, 145, 12)
      .fillAndStroke("#FBF8FC", "#E6D7EC");

    doc
      .fillColor("#603763")
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("Payment Information", 65, summaryY + 15);

    doc.fillColor("#1A1C1D").fontSize(11).font("Helvetica");

    doc.text("Method", 65, summaryY + 50);
    doc.text(order.paymentMethod, 180, summaryY + 50);

    doc.text("Status", 65, summaryY + 75);
    doc.text(order.paymentStatus, 180, summaryY + 75);

    doc.text("Order ID", 65, summaryY + 100);
    doc.text(order.orderId, 145, summaryY + 100, { width: 120 });

    /* =========================================
       FOOTER
    ========================================= */

    const footerY = summaryY + 170;

    doc
      .moveTo(50, footerY)
      .lineTo(560, footerY)
      .strokeColor("#E6D7EC")
      .stroke();

    doc
      .fontSize(11)
      .fillColor("#7A7A7A")
      .font("Helvetica")
      .text("Thank you for shopping with iStore.", 0, footerY + 15, {
        align: "center",
      });

    doc
      .fontSize(9)
      .fillColor("#A0A0A0")
      .text(
        "Order generated electronically by iStore",
        0,
        footerY + 32,
        { align: "center" }
      );

    doc.end();
  } catch (error) {
    console.log("Invoice Download Error:", error);
    return res.redirect("/orders");
  }
};