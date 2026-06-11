import PDFDocument from "pdfkit";

import {
  getSalesReportService,
} from "../../services/admin/salesService.js";

/* =========================================
   DOWNLOAD SALES REPORT PDF
========================================= */

export const downloadSalesReportPDF =
async (req, res) => {

  try {

    const {

      filter = "daily",

      startDate,

      endDate,

    } = req.query;

    const report =
    await getSalesReportService(

      filter,

      startDate,

      endDate,

    );

    const doc =
    new PDFDocument({

      margin: 50,

    });

    res.setHeader(
      "Content-Type",
      "application/pdf",
    );

    res.setHeader(

      "Content-Disposition",

      `attachment; filename=sales-report-${filter}.pdf`

    );

    doc.pipe(res);

    /* ==========================
       HEADER
    ========================== */

    doc
      .fontSize(24)
      .text(
        "iStore Sales Report",
        {
          align: "center",
        }
      );

    doc.moveDown();

    doc
      .fontSize(12)
      .text(
        `Report Type: ${filter.toUpperCase()}`
      );

    doc
      .text(
        `Generated On: ${new Date().toLocaleDateString("en-IN")}`
      );

    doc.moveDown();

    /* ==========================
       SUMMARY
    ========================== */

    doc
      .fontSize(16)
      .text("Summary");

    doc.moveDown(0.5);

    doc.text(
      `Total Sales Count: ${report.totalSalesCount}`
    );

    doc.text(
      `Total Order Amount: ₹${report.totalOrderAmount.toLocaleString("en-IN")}`
    );

    doc.text(
      `Total Discount: ₹${report.totalDiscount.toLocaleString("en-IN")}`
    );

    doc.text(
      `Coupon Deduction: ₹${report.totalCouponDeduction.toLocaleString("en-IN")}`
    );

    doc.moveDown();

    /* ==========================
       RECENT ORDERS
    ========================== */

    doc
      .fontSize(16)
      .text("Recent Orders");

    doc.moveDown(0.5);

    report.recentOrders.forEach(

      (order) => {

        doc.text(

          `${order.orderId} | ₹${order.finalAmount} | ${order.orderStatus}`

        );

      }

    );

    doc.end();

  }

  catch (error) {

    console.log(
      "PDF Download Error:",
      error,
    );

    return res.redirect(
      "/admin/sales-report",
    );

  }

};