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

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales-report-${filter}.pdf`
    );

    doc.pipe(res);

    /* ── Helpers ── */
    const inr = (n) =>
      "Rs." + Number(n || 0).toLocaleString("en-IN");

    const pageW   = doc.page.width  - doc.page.margins.left - doc.page.margins.right;
    const left    = doc.page.margins.left;

    /* =============================================
       HEADER BAND
    ============================================= */
    doc
      .rect(0, 0, doc.page.width, 90)
      .fill("#1a0a2e");

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
        62
      );

    doc.y = 110;

    /* =============================================
       SUMMARY CARDS — two-column grid
    ============================================= */
    const cardW = (pageW - 12) / 2;
    const cards = [
      { label: "Total Delivered Orders", value: String(report.totalSalesCount) },
      { label: "Gross Revenue",           value: inr(report.grossRevenue) },
      { label: "Total Refunds",           value: inr(report.totalRefundAmount) },
      { label: "Net Revenue",             value: inr(report.netRevenue) },
      { label: "Total Discounts",         value: inr(report.totalDiscount) },
      { label: "Coupon Deductions",       value: inr(report.totalCouponDeduction) },
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
        .text(card.label.toUpperCase(), x + 12, rowY + 10, { width: cardW - 24 });

      doc
        .fillColor("#1a0a2e")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(card.value, x + 12, rowY + 24, { width: cardW - 24 });

      col++;
      if (col === 2) {
        col  = 0;
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
      doc
        .rect(left, doc.y, pageW, 26)
        .fill("#1a0a2e");
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
      const rowH  = 22;
      const tblX  = left;
      let   tblY  = doc.y;

      /* Header row */
      doc.rect(tblX, tblY, pageW, rowH).fill("#ede9fe");
      let cx = tblX + 8;
      headers.forEach((h, i) => {
        doc
          .fillColor("#4c1d95")
          .fontSize(8)
          .font("Helvetica-Bold")
          .text(h, cx, tblY + 7, { width: colWidths[i] - 8, align: i > 1 ? "right" : "left" });
        cx += colWidths[i];
      });
      tblY += rowH;

      /* Data rows */
      rows.forEach((row, ri) => {
        /* page-break guard */
        if (tblY + rowH > doc.page.height - 60) {
          doc.addPage();
          tblY = doc.page.margins.top;
        }

        doc.rect(tblX, tblY, pageW, rowH).fill(ri % 2 === 0 ? "#faf9ff" : "#ffffff");

        doc
          .rect(tblX, tblY, pageW, rowH)
          .strokeColor("#e2d9f3")
          .lineWidth(0.5)
          .stroke();

        cx = tblX + 8;
        row.forEach((cell, i) => {
          doc
            .fillColor("#1a0a2e")
            .fontSize(8)
            .font("Helvetica")
            .text(String(cell ?? "—"), cx, tblY + 7, {
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

    const prodColW = [pageW * 0.55, pageW * 0.20, pageW * 0.25];
    drawTable(
      ["Product Name", "Units Sold", "Revenue"],
      report.topProducts.map(p => [
        p.name,
        p.units ?? 0,
        inr(p.revenue),
      ]),
      prodColW
    );

    /* =============================================
       TOP CATEGORIES TABLE
    ============================================= */
    sectionHeading("Sales by Category");

    const catColW = [pageW * 0.55, pageW * 0.20, pageW * 0.25];
    drawTable(
      ["Category", "Share %", "Revenue"],
      report.topCategories.map(c => [
        c._id,
        c.percentage + "%",
        inr(c.revenue),
      ]),
      catColW
    );

    /* =============================================
       RECENT ORDERS TABLE
       Uses order.displayAmount so returned orders
       show the original paid amount, not ₹0.
       Shows all order statuses (consistent with
       the web sales report page and Excel export).
    ============================================= */
    sectionHeading("Recent Orders");

    const ordColW = [pageW * 0.38, pageW * 0.26, pageW * 0.18, pageW * 0.18];
    drawTable(
      ["Order ID", "Status", "Amount", "Date"],
      report.recentOrders.map(o => [
        o.orderId,
        o.orderStatus,
        inr(o.displayAmount),   // pricingSnapshot.originalFinalAmount — never ₹0
        new Date(o.createdAt).toLocaleDateString("en-IN"),
      ]),
      ordColW
    );

    /* =============================================
       FOOTER
    ============================================= */
    const pageCount = doc.bufferedPageRange
      ? doc.bufferedPageRange().count
      : 1;

    doc
      .fontSize(8)
      .fillColor("#9ca3af")
      .text(
        `iStore Admin  ·  Confidential  ·  Page 1 of ${pageCount}`,
        left,
        doc.page.height - 40,
        { width: pageW, align: "center" }
      );

    doc.end();

  } catch (error) {
    console.error("PDF Download Error:", error);
    return res.redirect("/admin/sales-report");
  }
};