import {
  getSalesReportService,
} from "../../services/admin/salesService.js";

export const loadSalesReport =
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

    res.render(
      "admin/sales-report",
      {

        page: "reports",

        report,

        filter,

        startDate,

        endDate,

      },
    );

  }

  catch (error) {

    console.log(
      "Sales Report Error:",
      error,
    );

    return res.redirect(
      "/admin/dashboard",
    );

  }

};