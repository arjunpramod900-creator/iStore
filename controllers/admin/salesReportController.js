import PDFDocument from "pdfkit";
import { getSalesReportService } from "../../services/admin/salesService.js";

/* =========================================
   DOWNLOAD SALES REPORT PDF
   FIX: use order.displayAmount (set by
   salesService) so returned orders show
   the original paid amount, not ₹0.
========================================= */
export const downloadSalesReportPDF = async (req, res) => {
  try {
    const { filter = "daily", startDate, endDate } = req.query;

    const report = await getSalesReportService(filter, startDate, endDate);

    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales-report-${filter}.pdf`,
    );

    doc.pipe(res);

    /* ── Helpers ── */
    const inr = (n) => "Rs." + Number(n || 0).toLocaleString("en-IN");

    const pageW =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    /* =============================================
       HEADER BAND
    ============================================= */
    doc.rect(0, 0, doc.page.width, 90).fill("#1a0a2e");

    doc
      .fillColor("#ffffff")
      .fontSize(26)
      .font("Helvetica-Bold")
      .text("iStore", left, 22, { continued: true })
      .fillColor("#a78bfa")
      .text("  Sales Report");

    doc
      .fillColor("rgba(255,255,255,0.6)")
      .fontSize(10)
      .font("Helvetica")
      .text(
        `${filter.toUpperCase()} · ${report.resolvedStartDate} — ${report.resolvedEndDate}   ·   Generated ${new Date().toLocaleDateString("en-IN")}`,
        left,
        62,
      );

    doc.y = 110;

    /* =============================================
       SUMMARY CARDS — two-column grid
    ============================================= */
    const cardW = (pageW - 12) / 2;
    const cards = [
      {
        label: "Total Delivered Orders",
        value: String(report.totalSalesCount),
      },
      { label: "Gross Revenue", value: inr(report.grossRevenue) },
      { label: "Total Refunds", value: inr(report.totalRefundAmount) },
      { label: "Net Revenue", value: inr(report.netRevenue) },
      { label: "Total Discounts", value: inr(report.totalDiscount) },
      { label: "Coupon Deductions", value: inr(report.totalCouponDeduction) },
    ];

    let col = 0;
    let rowY = doc.y;

    cards.forEach((card, i) => {
      const x = left + col * (cardW + 12);

      doc
        .roundedRect(x, rowY, cardW, 54, 6)
        .fillAndStroke("#f5f3ff", "#e2d9f3");

      doc
        .fillColor("#6b21a8")
        .fontSize(8)
        .font("Helvetica-Bold")
        .text(card.label.toUpperCase(), x + 12, rowY + 10, {
          width: cardW - 24,
        });

      doc
        .fillColor("#1a0a2e")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(card.value, x + 12, rowY + 24, { width: cardW - 24 });

      col++;
      if (col === 2) {
        col = 0;
        rowY += 64;
      }
    });

    if (col !== 0) rowY += 64;
    doc.y = rowY + 8;

    /* =============================================
       SECTION HEADING helper
    ============================================= */
    function sectionHeading(title) {
      doc.moveDown(0.6);
      if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
      doc.rect(left, doc.y, pageW, 26).fill("#1a0a2e");
      doc
        .fillColor("#ffffff")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(title, left + 10, doc.y - 20);
      doc.moveDown(0.4);
    }

    /* =============================================
       TABLE helper
    ============================================= */
    function drawTable(headers, rows, colWidths) {
      const rowH = 22;
      const tblX = left;
      let tblY = doc.y;

      /* Check if we have enough space for Header + 1 row */
      if (tblY + rowH * 2 > doc.page.height - 60) {
          doc.addPage();
          tblY = doc.page.margins.top;
      }

      /* Header row */
      doc.rect(tblX, tblY, pageW, rowH).fill("#ede9fe");
      let cx = tblX + 8;
      headers.forEach((h, i) => {
        doc
          .fillColor("#4c1d95")
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(h, cx, tblY + 7, {
            width: colWidths[i] - 8,
            align: i > 1 ? "right" : "left",
          });
        cx += colWidths[i];
      });
      tblY += rowH;

      /* Data rows */
      rows.forEach((row, ri) => {
        /* page-break guard */
        if (tblY + rowH > doc.page.height - 60) {
          doc.addPage();
          tblY = doc.page.margins.top;
          
          /* Re-draw header on new page */
          doc.rect(tblX, tblY, pageW, rowH).fill("#ede9fe");
          let hcx = tblX + 8;
          headers.forEach((h, i) => {
            doc.fillColor("#4c1d95").fontSize(8).font("Helvetica-Bold")
               .text(h, hcx, tblY + 7, { width: colWidths[i] - 8, align: i > 1 ? "right" : "left" });
            hcx += colWidths[i];
          });
          tblY += rowH;
        }

        doc
          .rect(tblX, tblY, pageW, rowH)
          .fill(ri % 2 === 0 ? "#faf9ff" : "#ffffff");

        doc
          .rect(tblX, tblY, pageW, rowH)
          .strokeColor("#e2d9f3")
          .lineWidth(0.5)
          .stroke();

        cx = tblX + 8;
        row.forEach((cell, i) => {
          const cellStr = String(cell ?? "—");
          let cColor = "#1a0a2e"; // default
          const lcell = cellStr.toLowerCase();
          
          if (["delivered", "paid", "return approved"].includes(lcell)) cColor = "#059669"; // green
          else if (["returned", "refunded"].includes(lcell)) cColor = "#603763"; // purple
          else if (["cancelled", "failed", "return rejected"].includes(lcell)) cColor = "#dc2626"; // red
          else if (["pending", "processing", "shipped", "out for delivery", "return requested"].includes(lcell)) cColor = "#d97706"; // orange
          else if (cellStr.includes("— OFF") || cellStr === "—") cColor = "#9ca3af"; // gray for empty

          doc
            .fillColor(cColor)
            .fontSize(8)
            .font("Helvetica")
            .text(cellStr, cx, tblY + 7, {
              width: colWidths[i] - 8,
              align: i > 1 ? "right" : "left",
            });
          cx += colWidths[i];
        });
        tblY += rowH;
      });

      doc.y = tblY + 8;
    }

    /* =============================================
       TOP PRODUCTS TABLE
    ============================================= */
    sectionHeading("Top Products by Revenue");

    const prodColW = [pageW * 0.55, pageW * 0.2, pageW * 0.25];
    drawTable(
      ["Product Name", "Units Sold", "Revenue"],
      report.topProducts.map((p) => [p.name, p.units ?? 0, inr(p.revenue)]),
      prodColW,
    );

    /* =============================================
       TOP CATEGORIES TABLE
    ============================================= */
    sectionHeading("Sales by Category");

    const catColW = [pageW * 0.55, pageW * 0.2, pageW * 0.25];
    drawTable(
      ["Category", "Share %", "Revenue"],
      report.topCategories.map((c) => [
        c._id,
        c.percentage + "%",
        inr(c.revenue),
      ]),
      catColW,
    );

    /* =============================================
       RECENT ORDERS TABLE (Detailed Item Breakdown)
    ============================================= */
    sectionHeading("Recent Orders (Detailed Item Breakdown)");

    const flattenedRows = [];
    report.recentOrders.forEach(o => {
      if (o.items && o.items.length > 0) {
        o.items.forEach((item, idx) => {
           let prodName = item.productName;
           if (prodName.length > 25) prodName = prodName.substring(0, 23) + "...";
           
           let itemPayStatus = o.paymentStatus || "Pending";
           if (item.itemStatus === "Cancelled" || item.itemStatus === "Returned") {
               if (o.paymentMethod !== "COD" || o.paymentStatus === "Paid") {
                   itemPayStatus = "Refunded";
               } else {
                   itemPayStatus = "Cancelled";
               }
           }
           
           const itemTax = Math.round((item.finalPrice || 0) * 0.02);
           const itemTotal = (item.finalPrice || item.price * item.quantity) + (o.taxAmount > 0 ? itemTax : 0);
           
           flattenedRows.push([
             idx === 0 ? o.orderId : "",
             idx === 0 ? new Date(o.createdAt).toLocaleDateString("en-IN", {day:'2-digit', month:'2-digit', year:'2-digit'}) : "",
             prodName,
             item.quantity,
             inr(itemTotal),
             item.refundAmount > 0 ? inr(item.refundAmount) : "—",
             item.itemStatus || o.orderStatus,
             itemPayStatus,
             idx === 0 ? o.orderStatus : "",
             idx === 0 ? (o.paymentMethod || "COD") : "",
           ]);
        });
      } else {
         flattenedRows.push([
           o.orderId,
           new Date(o.createdAt).toLocaleDateString("en-IN", {day:'2-digit', month:'2-digit', year:'2-digit'}),
           "No items found",
           "—",
           inr(o.displayAmount),
           "—",
           "—",
           o.paymentStatus || "Pending",
           o.orderStatus,
           o.paymentMethod || "COD"
         ]);
      }
    });

    const ordColW = [
      pageW * 0.16, // Order ID
      pageW * 0.07, // Date
      pageW * 0.21, // Product
      pageW * 0.03, // Qty
      pageW * 0.09, // Item Total
      pageW * 0.09, // Refund
      pageW * 0.09, // Item Status
      pageW * 0.09, // Pay Status
      pageW * 0.09, // Order Status
      pageW * 0.08, // Pay Method
    ];
    drawTable(
      ["Order ID", "Date", "Product", "Qty", "Item Total", "Refund", "Item Status", "Pay Status", "Order Status", "Method"],
      flattenedRows,
      ordColW,
    );

    /* =============================================
       FOOTER
    ============================================= */
    const pageCount = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;

    doc
      .fontSize(8)
      .fillColor("#9ca3af")
      .text(
        `iStore Admin  ·  Confidential  ·  Page 1 of ${pageCount}`,
        left,
        doc.page.height - 40,
        { width: pageW, align: "center" },
      );

    doc.end();
  } catch (error) {
    console.error("PDF Download Error:", error);
    return res.redirect("/admin/sales-report");
  }
};
