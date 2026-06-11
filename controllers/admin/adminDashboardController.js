import {
  getDashboardDataService,
} from "../../services/admin/dashboardService.js";

export const renderAdminDashboard =
async (req, res) => {

  try {

    /* ==========================
       SESSION CHECK
    ========================== */

    if (!req.session.adminId) {

      return res.redirect(
        "/admin/login"
      );

    }

    /* ==========================
       FILTER
    ========================== */

    const {
      filter = "weekly",
    } = req.query;

    /* ==========================
       DASHBOARD DATA
    ========================== */

    const dashboardData =
    await getDashboardDataService(
      filter
    );

    /* ==========================
       CACHE FIX
    ========================== */

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, private",
    );

    res.setHeader(
      "Pragma",
      "no-cache"
    );

    res.setHeader(
      "Expires",
      "0"
    );

    /* ==========================
       RENDER
    ========================== */

    res.render(
      "admin/dashboard",
      {

        page:
          "dashboard",

        dashboardData,

        filter,

      },
    );

  }

  catch (error) {

    console.log(
      "Dashboard Error:",
      error,
    );

    return res.redirect(
      "/admin/login"
    );

  }

};