import { getSalesReportService } from "../../services/admin/salesService.js";

export const loadSalesReport = async (req, res) => {
  try {
    /* Default to weekly so the active chip in the EJS matches */
    const {
      filter    = "weekly",
      startDate,
      endDate,
    } = req.query;

    const report = await getSalesReportService(filter, startDate, endDate);

    res.render("admin/sales-report", {
      page: "sales-report",
      report,
      filter,
      /* Use resolved dates from the service so "undefined" never renders */
      startDate: startDate || report.resolvedStartDate,
      endDate:   endDate   || report.resolvedEndDate,
    });

  } catch (error) {
    console.log("Sales Report Error:", error);
    return res.redirect("/admin/dashboard");
  }
};