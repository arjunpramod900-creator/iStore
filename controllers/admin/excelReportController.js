import ExcelJS from "exceljs";
import { getSalesReportService } from "../../services/admin/salesService.js";

export const downloadSalesReportExcel = async (req, res) => {

  try {
    const { filter = "daily", startDate, endDate } = req.query;
    const report = await getSalesReportService(filter, startDate, endDate);

    const workbook  = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales Report");

    /* ── Column definitions ── */
    worksheet.columns = [
      { header: "Order ID",  key: "orderId",   width: 28 },
      { header: "Customer",  key: "customer",  width: 22 },
      { header: "Amount",    key: "amount",    width: 18 },
      { header: "Status",    key: "status",    width: 20 },
      { header: "Date",      key: "date",      width: 18 },
    ];

    /* ── Style the header row ── */
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell(cell => {
      cell.font            = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill            = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A0A2E" } };
      cell.alignment       = { vertical: "middle", horizontal: "center" };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFA78BFA" } },
      };
    });
    headerRow.height = 22;

    /* ── Order rows — ALL orders in period, use displayAmount so
          returned orders show what the customer originally paid ── */
    report.recentOrders.forEach((order, idx) => {
      const row = worksheet.addRow({
        orderId:  order.orderId,
        customer: order.shippingAddress?.fullName || "—",
        // displayAmount is set by salesService using pricingSnapshot.originalFinalAmount
        // so returned orders never show ₹0
        amount:   order.displayAmount ?? order.finalAmount ?? 0,
        status:   order.orderStatus,
        date:     new Date(order.createdAt).toLocaleDateString("en-IN"),
      });

      /* Alternate row shading */
      const bg = idx % 2 === 0 ? "FFFAF9FF" : "FFFFFFFF";
      row.eachCell(cell => {
        cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
        cell.alignment = { vertical: "middle" };
      });

      /* Right-align Amount */
      row.getCell("amount").alignment = { horizontal: "right" };

      /* Colour the Status cell to match badge colours */
      const statusCell  = row.getCell("status");
      const statusUpper = (order.orderStatus || "").toUpperCase();
      const statusColors = {
        DELIVERED:        "FF16A34A",
        RETURNED:         "FFDC2626",
        CANCELLED:        "FF6B7280",
        PENDING:          "FFD97706",
        PROCESSING:       "FF2563EB",
        SHIPPED:          "FF0891B2",
        "OUT FOR DELIVERY": "FF7C3AED",
      };
      if (statusColors[statusUpper]) {
        statusCell.font = { color: { argb: statusColors[statusUpper] }, bold: true };
      }
    });

    /* ── Empty separator ── */
    worksheet.addRow([]);

    /* ── Summary block ── */
    const summaryRows = [
      ["Total Orders Sold (Delivered)",  report.totalSalesCount],
      ["Total Returned Orders",          report.totalReturnedCount],
      ["Gross Revenue",                  report.grossRevenue],
      ["Total Refunds",                  report.totalRefundAmount],
      ["Net Revenue",                    report.netRevenue],
      ["Total Discount",                 report.totalDiscount],
      ["Coupon Deductions",              report.totalCouponDeduction],
      ["Avg Order Value",                report.avgOrderValue],
      ["Return Rate",                    report.returnRate + "%"],
    ];

    summaryRows.forEach(([label, value]) => {
      const row = worksheet.addRow([label, value]);
      row.getCell(1).font      = { bold: true };
      row.getCell(1).fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDE9FE" } };
      row.getCell(2).alignment = { horizontal: "right" };
    });

    /* ── HTTP headers ── */
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=sales-report-${filter}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.log("Excel Export Error:", error);
    res.redirect("/admin/sales-report");
  }
};