import ExcelJS from "exceljs";

import {
  getSalesReportService,
} from "../../services/admin/salesService.js";

export const downloadSalesReportExcel =
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
      endDate
    );

    const workbook =
    new ExcelJS.Workbook();

    const worksheet =
    workbook.addWorksheet(
      "Sales Report"
    );

    worksheet.columns = [

      {
        header: "Order ID",
        key: "orderId",
        width: 25,
      },

      {
        header: "Amount",
        key: "amount",
        width: 20,
      },

      {
        header: "Status",
        key: "status",
        width: 20,
      },

      {
        header: "Date",
        key: "date",
        width: 20,
      },

    ];

    report.recentOrders.forEach(
      (order) => {

        worksheet.addRow({

          orderId:
          order.orderId,

          amount:
          order.finalAmount,

          status:
          order.orderStatus,

          date:
          new Date(
            order.createdAt
          ).toLocaleDateString(
            "en-IN"
          ),

        });

      }
    );

    worksheet.addRow([]);

    worksheet.addRow([
      "Total Sales",
      report.totalSalesCount
    ]);

    worksheet.addRow([
      "Total Revenue",
      report.totalOrderAmount
    ]);

    worksheet.addRow([
      "Total Discount",
      report.totalDiscount
    ]);

    worksheet.addRow([
      "Coupon Deduction",
      report.totalCouponDeduction
    ]);

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

  }

  catch (error) {

    console.log(
      "Excel Export Error:",
      error
    );

    res.redirect(
      "/admin/sales-report"
    );

  }

};