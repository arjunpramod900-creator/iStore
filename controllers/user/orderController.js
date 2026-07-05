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
import { ORDER_STATUS, PAYMENT_STATUS, RETURN_STATUS } from "../../constants/orderEnums.js";


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

    // Pick up any coupon the user selected on the retry page.
    // If explicitly removed, code will be `false`. If untouched, it will be `undefined`.
    const couponCode = req.session.retryCoupon?.code;

    const response = await retryOrderPaymentService({
      userId,
      orderId,
      addressId,
      paymentMethod,
      couponCode,
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

    // Clear the retry coupon from session after a successful payment kick-off
    delete req.session.retryCoupon;

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
   LOAD ORDER FAILURE PAGE
========================================= */
export const loadOrderFailurePage = async (req, res) => {

  try {

    const userId = req.session.userId;
    const { orderId } = req.params;

    const response = await loadOrderDetailsService(
      userId,
      orderId
    );

    if (!response.success) {
      return res.redirect("/orders");
    }

    const order = response.order;

    /* REFACTOR: Allow both "Failed" and "Pending" orders to view this page */
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      return res.redirect(`/orders/${orderId}`);
    }

    return res.render("user/order-failure", {
      page: "orders",
      order,
    });

  } catch (error) {

    console.log("Load Order Failure Page Error:", error);
    return res.redirect("/orders");

  }

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

    /* Compute summary figures from ALL items to show the original pristine order state */
    const offerDiscount  = order.pricingSnapshot?.originalOfferDiscount ?? order.items.reduce((s, i) => s + ((i.offerDiscount || 0) * i.quantity), 0);
    const subtotal       = order.pricingSnapshot?.originalSubtotal ?? order.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const mrpTotal       = order.pricingSnapshot?.originalSubtotal ? (subtotal + offerDiscount) : order.items.reduce((s, i) => s + ((i.originalPrice || i.price) * i.quantity), 0);
    const couponDiscount = order.pricingSnapshot?.originalCouponDiscount ?? order.items.reduce((s, i) => s + (i.couponDiscount || 0), 0);
    
    const summaryTax      = order.pricingSnapshot?.originalTaxAmount ?? order.taxAmount;
    const summaryDelivery = order.pricingSnapshot?.originalDeliveryCharge ?? order.deliveryCharge;
    const summaryTotal    = order.pricingSnapshot?.originalFinalAmount ?? order.finalAmount;
    const refundAmount   = order.refundAmount || 0;

    /* ── Page height calculation ── */
    const MARGIN        = 50;
    const headerH       = 130;
    const infoCardsH    = 110;
    const shippingH     = 150;
    const itemsHeaderH  = 70;
    const itemRowH      = 45;
    const itemsH        = order.items.length * itemRowH + 20;
    const hasActiveItems = order.items.some(i => i.itemStatus !== ORDER_STATUS.CANCELLED && i.itemStatus !== ORDER_STATUS.RETURNED && i.itemReturnStatus !== RETURN_STATUS.APPROVED);
    
    const isRevised = (order.finalAmount < (order.pricingSnapshot?.originalFinalAmount || (order.finalAmount + refundAmount))) && hasActiveItems;

    let summaryCardsH = 195;
    if (refundAmount > 0 || isRevised) {
        summaryCardsH = hasActiveItems ? 385 : 320;   /* taller if revised summary exists */
    }
    const footerH       = 80;

    const totalHeight =
      MARGIN + headerH + infoCardsH + shippingH +
      itemsHeaderH + itemsH + summaryCardsH + footerH + MARGIN;

    const doc = new PDFDocument({
      margin:         0,
      size:           [842, totalHeight],
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
    doc.fontSize(24).fillColor("#1A1C1D").font("Helvetica-Bold").text("INVOICE", 650, 50);
    doc.fontSize(12).fillColor("#603763").font("Helvetica-Bold").text(`Invoice #${order.orderId}`, 650, 82);

    /* ── INFO CARDS (Customer + Order Details) ── */
    const startY = 140;

    /* Customer card */
    doc.rect(50, startY, 350, 105).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold").text("Customer", 65, startY + 15);
    doc.fillColor("#1A1C1D").fontSize(11).font("Helvetica")
      .text(order.shippingAddress?.fullName   || "", 65, startY + 40)
      .text(order.shippingAddress?.phoneNumber || "", 65, startY + 58)
      .text(
        `${order.shippingAddress?.city || ""}, ${order.shippingAddress?.state || ""}`,
        65, startY + 75
      );

    /* Order Details card */
    doc.rect(440, startY, 350, 105).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold").text("Order Details", 455, startY + 15);
    doc.fillColor("#1A1C1D").fontSize(11).font("Helvetica")
      .text(`Order: ${order.orderId}`, 455, startY + 40)
      .text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-IN")}`, 455, startY + 58);

    /* Order status badge inside Order Details card */
    const orderStyle = getOrderStatusStyle(order.orderStatus);
    doc.roundedRect(455, startY + 76, 110, 20, 8)
       .fillAndStroke(orderStyle.bg, orderStyle.bg);
    doc.fillColor(orderStyle.text).fontSize(10).font("Helvetica-Bold")
       .text(orderStyle.label, 460, startY + 82, { width: 100, align: "center" });

    /* ── SHIPPING ADDRESS ── */
    const shippingY = 270;
    doc.roundedRect(50, shippingY, 742, 130, 12).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc.fillColor("#603763").fontSize(14).font("Helvetica-Bold")
       .text("Shipping Address", 65, shippingY + 15);
    doc.fillColor("#1A1C1D").fontSize(11).font("Helvetica")
       .text(order.shippingAddress?.fullName || "", 65, shippingY + 40);
    doc.moveTo(420, shippingY + 30).lineTo(420, shippingY + 110).strokeColor("#E6D7EC").stroke();
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
      .text(`Phone: ${order.shippingAddress?.phoneNumber || ""}`, 440, shippingY + 40);

    /* ── ITEMS HEADING ── */
    doc.fontSize(18).fillColor("#603763").font("Helvetica-Bold").text("Order Items", 360, 430);

    /* ── TABLE HEADER ── */
    const tableTop = 470;
    doc.rect(50, tableTop, 742, 28).fill("#3e037d");
    doc.fillColor("#FFFFFF").fontSize(10).font("Helvetica-Bold")
      .text("Product",  60,  tableTop + 9)
      .text("Status",   250, tableTop + 9)
      .text("Qty",      340, tableTop + 9)
      .text("MRP",      380, tableTop + 9)
      .text("Offer",    460, tableTop + 9)
      .text("Coupon",   540, tableTop + 9)
      .text("Tax",      620, tableTop + 9)
      .text("Total",    690, tableTop + 9);

    doc.rect(50, tableTop, 742, order.items.length * itemRowH + 20)
       .strokeColor("#E6D7EC").stroke();

    /* ── TABLE ROWS ── */
    let y = tableTop + 35;

    order.items.forEach((item, index) => {
      const itemStyle  = getOrderStatusStyle(item.itemStatus || order.orderStatus);

      // Calculations for breakdown
      const itemQty = item.quantity;
      const itemMRP = (item.originalPrice || item.price) * itemQty;
      const itemOffer = (item.offerDiscount || 0) * itemQty;
      const itemCoupon = item.couponDiscount || 0;
      const itemTax = Math.round(item.finalPrice * 0.02);
      const itemTotal = item.finalPrice + itemTax;

      if (index % 2 === 0) {
        doc.rect(50, y - 4, 742, itemRowH - 2).fill("#FBF8FC");
      }

      doc.fillColor("#1A1C1D").font("Helvetica").fontSize(9)
        /* Product name + variant */
        .text(item.productName, 60, y, { width: 180, ellipsis: true })
        .text(item.variantName || "", 60, y + 13, { width: 180, ellipsis: true });

      /* Item status badge */
      doc.roundedRect(248, y - 2, 80, 17, 6)
         .fillAndStroke(itemStyle.bg, itemStyle.bg);
      doc.fillColor(itemStyle.text).fontSize(8).font("Helvetica-Bold")
         .text(itemStyle.label, 250, y + 4, { width: 76, align: "center" });

      doc.fillColor("#1A1C1D").font("Helvetica").fontSize(9)
        .text(itemQty.toString(), 340, y)
        .text(`Rs.${itemMRP.toLocaleString("en-IN")}`, 380, y)
        .text(`-Rs.${itemOffer.toLocaleString("en-IN")}`, 460, y)
        .text(`-Rs.${itemCoupon.toLocaleString("en-IN")}`, 540, y)
        .text(`+Rs.${itemTax.toLocaleString("en-IN")}`, 620, y)
        .font("Helvetica-Bold")
        .text(`Rs.${itemTotal.toLocaleString("en-IN")}`, 690, y);

      y += itemRowH;
    });

    /* ── SUMMARY CARDS ── */
    const summaryY = y + 30;

    /* Payment Information card */
    doc.roundedRect(50, summaryY, 350, 170, 12).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold")
       .text("Payment Information", 65, summaryY + 15);

    /* Payment Method */
    doc.fillColor("#7A7A7A").fontSize(10).font("Helvetica")
       .text("Method", 65, summaryY + 48);
    doc.fillColor("#1A1C1D").fontSize(11).font("Helvetica-Bold")
       .text(order.paymentMethod, 160, summaryY + 47);

    /* Payment Status */
    const payStyle = getPaymentStatusStyle(order.paymentStatus);
    doc.fillColor("#7A7A7A").fontSize(10).font("Helvetica")
       .text("Payment", 65, summaryY + 73);
    doc.roundedRect(155, summaryY + 70, 80, 17, 6)
       .fillAndStroke(payStyle.bg, payStyle.bg);
    doc.fillColor(payStyle.text).fontSize(9).font("Helvetica-Bold")
       .text(order.paymentStatus, 157, summaryY + 76, { width: 76, align: "center" });

    /* Order Status */
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

    /* Delivered date */
    if (order.deliveredDate) {
      doc.fillColor("#7A7A7A").fontSize(10).font("Helvetica")
         .text("Delivered", 65, summaryY + 148);
      doc.fillColor("#1A1C1D").fontSize(10).font("Helvetica")
         .text(
           new Date(order.deliveredDate).toLocaleDateString("en-IN"),
           145, summaryY + 148
         );
    }

    /* ── REFUND / REVISION CHECK ── */
    const originalFinalAmountForInvoice = order.pricingSnapshot?.originalFinalAmount || (order.finalAmount + refundAmount);
    /* Payment Summary card */
    doc.roundedRect(440, summaryY, 350, 170, 12).fillAndStroke("#FBF8FC", "#E6D7EC");
    doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold")
       .text(isRevised ? "Original Order Summary" : "Payment Summary", 455, summaryY + 15);

    if (isRevised) {
        doc.fillColor("#D32F2F").fontSize(8).font("Helvetica-Oblique")
           .text("(Outdated — See Revised Summary)", 620, summaryY + 18, { width: 150, align: "right" });
    }

    const summaryRows = [];
    summaryRows.push({ label: "MRP Total", value: `Rs.${mrpTotal.toLocaleString("en-IN")}` });
    
    if (offerDiscount > 0) {
      summaryRows.push({ label: "Offer Discount", value: `- Rs.${offerDiscount.toLocaleString("en-IN")}` });
    }
    
    summaryRows.push({ label: "Subtotal", value: `Rs.${subtotal.toLocaleString("en-IN")}` });
    
    if (couponDiscount > 0) {
      summaryRows.push({ label: `Coupon ${order.couponCode ? '(' + order.couponCode + ')' : ''}`, value: `- Rs.${couponDiscount.toLocaleString("en-IN")}` });
    }
    
    summaryRows.push({ label: "Tax", value: `Rs.${summaryTax.toLocaleString("en-IN")}` });
    summaryRows.push({ label: "Shipping", value: summaryDelivery === 0 ? "Free" : `Rs.${summaryDelivery.toLocaleString("en-IN")}` });

    summaryRows.forEach((row, i) => {
      const rowY = summaryY + 44 + i * 16;
      doc.fillColor(isRevised ? "#9CA3AF" : "#7A7A7A").fontSize(9).font("Helvetica").text(row.label, 455, rowY);
      doc.fillColor(isRevised ? "#9CA3AF" : "#1A1C1D").fontSize(9).font(isRevised ? "Helvetica-Oblique" : "Helvetica").text(row.value, 710, rowY, { align: "right", width: 60 });
    });

    /* Divider + Total */
    doc.moveTo(455, summaryY + 142).lineTo(775, summaryY + 142).strokeColor("#E6D7EC").stroke();
    doc.fillColor(isRevised ? "#9CA3AF" : "#603763").fontSize(13).font("Helvetica-Bold")
       .text("Total", 455, summaryY + 150)
       .text(`Rs.${summaryTotal.toLocaleString("en-IN")}`, 690, summaryY + 150, { align: "right", width: 80 });

    /* ── REFUND SUMMARY (if applicable) ── */
    let refundY = summaryY + 185;

    if (refundAmount > 0) {
      doc.roundedRect(440, refundY, 350, 120, 12).fillAndStroke("#F9FAFB", "#F3F4F6");
      doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold")
         .text("Refund Summary", 455, refundY + 15);
         
      const mathDiff = originalFinalAmountForInvoice - order.finalAmount;
      
      const refRows = [
        { label: "Original Order Paid", value: `Rs.${originalFinalAmountForInvoice.toLocaleString("en-IN")}` },
        { label: "Revised Order Value", value: `- Rs.${order.finalAmount.toLocaleString("en-IN")}` }
      ];
      
      if (mathDiff > refundAmount) {
        refRows.push({ label: "Adjustment Cap", value: `+ Rs.${(mathDiff - refundAmount).toLocaleString("en-IN")}` });
      }
      
      refRows.forEach((row, i) => {
        const rowY = refundY + 40 + i * 16;
        doc.fillColor("#4B5563").fontSize(9).font("Helvetica").text(row.label, 455, rowY);
        doc.fillColor("#4B5563").fontSize(9).font("Helvetica").text(row.value, 710, rowY, { align: "right", width: 60 });
      });
      
      doc.moveTo(455, refundY + 92).lineTo(775, refundY + 92).strokeColor("#D1D5DB").stroke();
      doc.fillColor("#111827").fontSize(11).font("Helvetica-Bold")
         .text("Refund Amount", 455, refundY + 100)
         .text(`Rs.${refundAmount.toLocaleString("en-IN")}`, 690, refundY + 100, { align: "right", width: 80 });
         
      doc.fillColor("#10B981").fontSize(8).font("Helvetica-Oblique")
         .text("Credited to your iStore Wallet", 455, refundY + 115);
    }

    /* ── REVISED SUMMARY (if applicable) ── */
    if (isRevised) {
      const activeItems = order.items.filter(i =>
          i.itemStatus !== ORDER_STATUS.CANCELLED &&
          i.itemStatus !== ORDER_STATUS.RETURNED  &&
          i.itemReturnStatus !== RETURN_STATUS.APPROVED
      );
      
      if (activeItems.length > 0) {
          const revMRP       = activeItems.reduce((s, i) => s + ((i.originalPrice || i.price) * i.quantity), 0);
          const revOffer     = activeItems.reduce((s, i) => s + ((i.offerDiscount || 0) * i.quantity), 0);
          const revSubtotal  = activeItems.reduce((s, i) => s + (i.price * i.quantity), 0);
          const revCoupon    = activeItems.reduce((s, i) => s + (i.couponDiscount || 0), 0);

          // If there's no Refund Summary, we can put Revised Summary on the left anyway (or right). We'll keep it left below Payment Info.
          doc.roundedRect(50, refundY, 350, 170, 12).fillAndStroke("#FBF8FC", "#E6D7EC");
          doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold")
             .text("Revised Summary", 65, refundY + 15);

          const revRows = [];
          revRows.push({ label: "MRP Total", value: `Rs.${revMRP.toLocaleString("en-IN")}` });
          if (revOffer > 0) revRows.push({ label: "Offer Discount", value: `- Rs.${revOffer.toLocaleString("en-IN")}` });
          revRows.push({ label: "Subtotal", value: `Rs.${revSubtotal.toLocaleString("en-IN")}` });
          if (revCoupon > 0) {
              revRows.push({ label: `Coupon`, value: `- Rs.${revCoupon.toLocaleString("en-IN")}` });
          } else if (order.couponCode) {
              revRows.push({ label: `Coupon (${order.couponCode})`, value: `Not Applicable` });
          }
          revRows.push({ label: "Tax", value: `Rs.${order.taxAmount.toLocaleString("en-IN")}` });
          revRows.push({ label: "Shipping", value: order.deliveryCharge === 0 ? "Free" : `Rs.${order.deliveryCharge.toLocaleString("en-IN")}` });

          revRows.forEach((row, i) => {
            const rowY = refundY + 44 + i * 16;
            doc.fillColor("#7A7A7A").fontSize(9).font("Helvetica").text(row.label, 65, rowY);
            doc.fillColor("#1A1C1D").fontSize(9).font("Helvetica").text(row.value, 320, rowY, { align: "right", width: 60 });
          });

          doc.moveTo(65, refundY + 142).lineTo(385, refundY + 142).strokeColor("#E6D7EC").stroke();
          doc.fillColor("#603763").fontSize(13).font("Helvetica-Bold")
             .text("Revised Total", 65, refundY + 150)
             .text(`Rs.${order.finalAmount.toLocaleString("en-IN")}`, 300, refundY + 150, { align: "right", width: 80 });
      }
    }

    /* ── FOOTER ── */
    let footerY = summaryY + 195;
    if (refundAmount > 0 || isRevised) {
        footerY = hasActiveItems ? summaryY + 385 : summaryY + 320;
    }
    doc.moveTo(50, footerY).lineTo(792, footerY).strokeColor("#E6D7EC").stroke();
    doc.fontSize(11).fillColor("#7A7A7A").font("Helvetica")
       .text("Thank you for shopping with iStore.", 0, footerY + 15, { align: "center", width: 842 });
    doc.fontSize(9).fillColor("#A0A0A0")
       .text("Order generated electronically by iStore", 0, footerY + 32, { align: "center", width: 842 });

    doc.end();

  } catch (error) {
    console.log("Invoice Download Error:", error);
    return res.redirect("/orders");
  }
};