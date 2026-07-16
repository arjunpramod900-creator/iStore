import Order from "../../models/Order.js";
import User from "../../models/User.js";
import Product from "../../models/Product.js";
import Variant from "../../models/Variant.js";
import {
  ORDER_STATUS,
  PAYMENT_STATUS,
  RETURN_STATUS,
} from "../../constants/orderEnums.js";

export const getDashboardDataService = async (filter = "weekly") => {
  const today = new Date();

  /* ================================================
     DATE RANGE per filter
  ================================================ */

  let rangeStart;
  let rangeEnd = new Date();
  rangeEnd.setHours(23, 59, 59, 999);

  if (filter === "daily") {
    rangeStart = new Date();
    rangeStart.setHours(0, 0, 0, 0);
  } else if (filter === "weekly") {
    rangeStart = new Date();
    rangeStart.setDate(today.getDate() - 6);
    rangeStart.setHours(0, 0, 0, 0);
  } else if (filter === "monthly") {
    rangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
    rangeStart.setHours(0, 0, 0, 0);
  } else if (filter === "yearly") {
    rangeStart = new Date(today.getFullYear(), 0, 1);
    rangeStart.setHours(0, 0, 0, 0);
  } else {
    rangeStart = new Date();
    rangeStart.setDate(today.getDate() - 6);
    rangeStart.setHours(0, 0, 0, 0);
  }

  /* ================================================
     MATCH STAGE
  ================================================ */

  const matchDelivered = {
    orderStatus: ORDER_STATUS.DELIVERED,
    createdAt: { $gte: rangeStart, $lte: rangeEnd },
  };

  const matchAllStatuses = {
    createdAt: { $gte: rangeStart, $lte: rangeEnd },
  };

  /* ================================================
     CHART FORMAT per filter
  ================================================ */

  let chartDateFormat;
  let chartGroupType;

  if (filter === "daily") {
    chartDateFormat = "%H:00";
    chartGroupType = "hour";
  } else if (filter === "weekly") {
    chartDateFormat = "%d %b";
    chartGroupType = "day";
  } else if (filter === "monthly") {
    chartDateFormat = "%d";
    chartGroupType = "day";
  } else {
    chartDateFormat = "%b";
    chartGroupType = "month";
  }

  /* ================================================
     TOTAL REVENUE (filtered)
  ================================================ */

  const revenueResult = await Order.aggregate([
    { $match: matchDelivered },
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: {
            $ifNull: ["$pricingSnapshot.originalFinalAmount", "$finalAmount"],
          },
        },
      },
    },
  ]);

  /* ================================================
     TOTAL ORDERS (filtered range, all statuses)
  ================================================ */

  const totalOrders = await Order.countDocuments(matchAllStatuses);

  /* ================================================
     TOTAL CUSTOMERS (all time — not filtered)
  ================================================ */

  const totalCustomers = await User.countDocuments({ isBlocked: false });

  /* ================================================
     TOTAL PRODUCTS (all time)
  ================================================ */

  const totalProducts = await Product.countDocuments({ isDeleted: false });

  /* ================================================
     TOTAL RETURNS (filtered)
  ================================================ */

  const totalReturns = await Order.countDocuments({
    ...matchAllStatuses,
    orderStatus: ORDER_STATUS.RETURNED,
  });

  /* ================================================
     RETURN RATE
  ================================================ */

  const returnRate =
    totalOrders > 0 ? ((totalReturns / totalOrders) * 100).toFixed(1) : 0;

  /* ================================================
     CANCELLED ORDERS (filtered)
  ================================================ */

  const totalCancelled = await Order.countDocuments({
    ...matchAllStatuses,
    orderStatus: ORDER_STATUS.CANCELLED,
  });

  /* ================================================
     PENDING ORDERS (filtered)
  ================================================ */

  const totalPending = await Order.countDocuments({
    ...matchAllStatuses,
    orderStatus: ORDER_STATUS.PENDING,
  });

  /* ================================================
     REVENUE CHART — two separate queries so dates are correct:
       Delivered orders  → bucketed by createdAt        (day revenue was earned)
       Returned orders   → bucketed by returnApprovedAt (day refund was processed)
  ================================================ */

  // Query 1: Gross Revenue — Delivered orders, grouped by order creation date
  const rawGrossChart = await Order.aggregate([
    {
      $match: {
        orderStatus: ORDER_STATUS.DELIVERED,
        createdAt: { $gte: rangeStart, $lte: rangeEnd },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: chartDateFormat,
            date: "$createdAt",
            timezone: "Asia/Kolkata",
          },
        },
        grossRevenue: {
          $sum: {
            $ifNull: ["$pricingSnapshot.originalFinalAmount", "$finalAmount"],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Query 2: Refunds — Returned orders, grouped by returnApprovedAt (when refund was processed)
  const rawRefundChart = await Order.aggregate([
    {
      $match: {
        orderStatus: ORDER_STATUS.RETURNED,
        $or: [
          { returnApprovedAt: { $gte: rangeStart, $lte: rangeEnd } },
          {
            returnApprovedAt: null,
            createdAt: { $gte: rangeStart, $lte: rangeEnd },
          },
        ],
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: chartDateFormat,
            date: { $ifNull: ["$returnApprovedAt", "$createdAt"] },
            timezone: "Asia/Kolkata",
          },
        },
        refundAmount: {
          $sum: {
            $ifNull: ["$pricingSnapshot.originalFinalAmount", "$finalAmount"],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  /* Build separate maps then compute per-bucket net revenue */
  const grossMap = {};
  const refundMap = {};
  rawGrossChart.forEach((item) => {
    grossMap[item._id] = item.grossRevenue || 0;
  });
  rawRefundChart.forEach((item) => {
    refundMap[item._id] = item.refundAmount || 0;
  });

  const chartLabels = generateChartLabels(
    filter,
    rangeStart,
    rangeEnd,
    chartGroupType,
  );
  const grossChartData = chartLabels.map((label) => grossMap[label] || 0);
  const netChartData = chartLabels.map((label) =>
    Math.max(0, (grossMap[label] || 0) - (refundMap[label] || 0)),
  );

  // Keep chartData as grossRevenue for backward compatibility
  const chartData = grossChartData;

  /* ================================================
     RECENT ORDERS (filtered, all statuses)
  ================================================ */

  const recentOrderDocs = await Order.find(matchAllStatuses)
    .populate("userId", "fullName")
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  const recentOrders = recentOrderDocs.map((order) => ({
    ...order,
    displayAmount:
      order.pricingSnapshot?.originalFinalAmount ?? order.finalAmount ?? 0,
  }));

  /* ================================================
     TOP SELLING PRODUCTS (filtered)
  ================================================ */

  const topProducts = await Order.aggregate([
    { $match: matchDelivered },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        productName: { $first: "$items.productName" },
        unitsSold: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: 5 },
  ]);

  /* ================================================
     LOW STOCK ALERTS (all time — not filtered)
  ================================================ */

  const stockAlerts = await Variant.find({
    isDeleted: false,
    isActive: true,
    stock: { $lte: 10 },
  })
    .populate("productId", "name")
    .sort({ stock: 1 })
    .limit(5)
    .lean();

  /* ================================================
     TOP CATEGORIES (filtered)
  ================================================ */

  const topCategories = await Order.aggregate([
    { $match: matchDelivered },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.productId",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $lookup: {
        from: "categories",
        localField: "product.categoryId",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: "$category" },
    {
      $group: {
        _id: "$category.name",
        revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        units: { $sum: "$items.quantity" },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 5 },
  ]);

  const totalCategoryRevenue = topCategories.reduce(
    (sum, c) => sum + c.revenue,
    0,
  );

  const categoriesWithPercentage = topCategories.map((cat) => ({
    ...cat,
    percentage:
      totalCategoryRevenue > 0
        ? Math.round((cat.revenue / totalCategoryRevenue) * 100)
        : 0,
  }));

  /* ================================================
     CHART TITLE per filter
  ================================================ */

  const chartTitles = {
    daily: "Today — Hourly Revenue",
    weekly: "Last 7 Days — Revenue",
    monthly: "This Month — Revenue",
    yearly: "This Year — Monthly Revenue",
  };

  return {
    /* KPIs */
    totalRevenue: revenueResult[0]?.totalRevenue || 0,
    totalOrders,
    totalCustomers,
    totalProducts,
    totalReturns,
    totalCancelled,
    totalPending,
    returnRate,

    /* Chart */
    chartLabels,
    chartData,
    grossChartData,
    netChartData,
    chartTitle: chartTitles[filter] || "Revenue Trends",

    /* Tables */
    recentOrders,
    topProducts,
    stockAlerts,
    topCategories: categoriesWithPercentage,

    /* Meta */
    filter,
    rangeLabel: `${rangeStart.toLocaleDateString("en-IN")} — ${rangeEnd.toLocaleDateString("en-IN")}`,
  };
};

/* ================================================
   HELPER — generate full label set (no gaps)
================================================ */

function generateChartLabels(filter, rangeStart, rangeEnd, chartGroupType) {
  const labels = [];

  if (chartGroupType === "hour") {
    for (let h = 0; h < 24; h++) {
      labels.push(`${String(h).padStart(2, "0")}:00`);
    }
    return labels;
  }

  if (chartGroupType === "month") {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const end = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
    const cur = new Date(start);
    while (cur <= end) {
      labels.push(monthNames[cur.getMonth()]);
      cur.setMonth(cur.getMonth() + 1);
    }
    return labels;
  }

  /* day-level */
  if (filter === "monthly") {
    const daysInMonth = new Date(
      rangeStart.getFullYear(),
      rangeStart.getMonth() + 1,
      0,
    ).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      labels.push(String(d).padStart(2, "0"));
    }
    return labels;
  }

  /* weekly — iterate actual dates */
  const cur = new Date(rangeStart);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const day = String(cur.getDate()).padStart(2, "0");
    const month = cur.toLocaleString("en-GB", { month: "short" });
    labels.push(`${day} ${month}`);
    cur.setDate(cur.getDate() + 1);
  }
  return labels;
}
