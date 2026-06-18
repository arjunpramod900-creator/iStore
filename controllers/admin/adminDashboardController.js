import { getDashboardDataService } from "../../services/admin/dashboardService.js";

export const renderAdminDashboard = async (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.redirect("/admin/login");
    }

    const { filter = "weekly" } = req.query;

    const dashboardData = await getDashboardDataService(filter);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, private");
    res.setHeader("Pragma",  "no-cache");
    res.setHeader("Expires", "0");

    res.render("admin/dashboard", {
      page: "dashboard",
      dashboardData,
      filter,
    });

  } catch (error) {
    console.log("Dashboard Error:", error);
    return res.redirect("/admin/login");
  }
};