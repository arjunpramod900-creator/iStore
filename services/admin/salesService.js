import Order from "../../models/Order.js";

export const getSalesReportService = async (filterType, startDate, endDate) => {

  const today = new Date();

  /* ================================================
     BUILD DATE RANGE per filter
  ================================================ */

  let rangeStart;
  let rangeEnd;

  if (filterType === "daily") {
    rangeStart = new Date();
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date();
    rangeEnd.setHours(23, 59, 59, 999);

  } else if (filterType === "weekly") {
    rangeStart = new Date();
    rangeStart.setDate(today.getDate() - 6); /* last 7 days including today */
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date();
    rangeEnd.setHours(23, 59, 59, 999);

  } else if (filterType === "monthly") {
    rangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    rangeEnd.setHours(23, 59, 59, 999);

  } else if (filterType === "yearly") {
    rangeStart = new Date(today.getFullYear(), 0, 1);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(today.getFullYear(), 11, 31);
    rangeEnd.setHours(23, 59, 59, 999);

  } else if (filterType === "custom" && startDate && endDate) {
    rangeStart = new Date(startDate);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);

  } else {
    /* fallback: weekly */
    rangeStart = new Date();
    rangeStart.setDate(today.getDate() - 6);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date();
    rangeEnd.setHours(23, 59, 59, 999);
  }

  /* ================================================
     MATCH STAGE — only Delivered orders for revenue
  ================================================ */

  const matchStage = {
    orderStatus: "Delivered",
    createdAt: { $gte: rangeStart, $lte: rangeEnd },
  };

  /* Match for counts (all statuses in range) */
  const matchAllStatuses = {
    createdAt: { $gte: rangeStart, $lte: rangeEnd },
  };

  /* ================================================
     CHART GROUPING FORMAT per filter
     daily   → group by hour  (00:00 … 23:00)
     weekly  → group by day   (Mon 12 Jun)
     monthly → group by day   (01 … 31)
     yearly  → group by month (Jan … Dec)
     custom  → auto: ≤31 days → by day, else by month
  ================================================ */

  let chartDateFormat;
  let chartGroupType; /* "hour" | "day" | "month" */

  if (filterType === "daily") {
    chartDateFormat = "%H:00";
    chartGroupType  = "hour";

  } else if (filterType === "weekly") {
    chartDateFormat = "%d %b";   /* e.g. "11 Jun" */
    chartGroupType  = "day";

  } else if (filterType === "monthly") {
    chartDateFormat = "%d";       /* day number */
    chartGroupType  = "day";

  } else if (filterType === "yearly") {
    chartDateFormat = "%b";       /* e.g. "Jan" */
    chartGroupType  = "month";

  } else {
    /* custom — decide by range length */
    const diffDays = Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) {
      chartDateFormat = "%H:00";
      chartGroupType  = "hour";
    } else if (diffDays <= 60) {
      chartDateFormat = "%d %b";
      chartGroupType  = "day";
    } else {
      chartDateFormat = "%b %Y";
      chartGroupType  = "month";
    }
  }

  /* ================================================
     SUMMARY REPORT
  ================================================ */

  const report = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSalesCount:     { $sum: 1 },
        totalOrderAmount:    { $sum: "$finalAmount" },
        totalDiscount:       { $sum: { $add: ["$offerDiscount", "$couponDiscount"] } },
        totalCouponDeduction: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ["$couponCode", null] }, { $ne: ["$couponCode", ""] }] },
              "$couponDiscount",
              0,
            ],
          },
        },
      },
    },
  ]);

  /* ================================================
     REVENUE CHART — fill ALL buckets so graph
     has no gaps (e.g. days with zero revenue still show)
  ================================================ */

  const rawChart = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id:     { $dateToString: { format: chartDateFormat, date: "$createdAt", timezone: "Asia/Kolkata" } },
        revenue: { $sum: "$finalAmount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  /* Build a lookup map from db results */
  const revenueMap = {};
  rawChart.forEach(item => { revenueMap[item._id] = item.revenue; });

  /* Generate full label set so chart never has gaps */
  const allLabels = generateLabels(filterType, rangeStart, rangeEnd, chartGroupType);

  const chartLabels = allLabels;
  const chartData   = allLabels.map(label => revenueMap[label] || 0);

  /* ================================================
     TOP PRODUCTS
  ================================================ */

  const topProducts = await Order.aggregate([
    { $match: matchStage },
    { $unwind: "$items" },
    {
      $group: {
        _id:     "$items.productId",
        name:    { $first: "$items.productName" },
        units:   { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
      },
    },
    { $sort: { units: -1 } },
    { $limit: 10 },
  ]);

  /* ================================================
     TOP CATEGORIES
  ================================================ */

  const topCategories = await Order.aggregate([
    { $match: matchStage },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products", localField: "items.productId",
        foreignField: "_id", as: "product",
      },
    },
    { $unwind: "$product" },
    {
      $lookup: {
        from: "categories", localField: "product.categoryId",
        foreignField: "_id", as: "category",
      },
    },
    { $unwind: "$category" },
    {
      $group: {
        _id:     "$category.name",
        revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  const totalCategoryRevenue = topCategories.reduce((sum, c) => sum + c.revenue, 0);

  const categoriesWithPercentage = topCategories.map(cat => ({
    ...cat,
    percentage: totalCategoryRevenue > 0
      ? Math.round((cat.revenue / totalCategoryRevenue) * 100)
      : 0,
  }));

  /* ================================================
     PAYMENT METHODS
  ================================================ */

  const paymentStats = await Order.aggregate([
    { $match: matchStage },
    { $group: { _id: "$paymentMethod", count: { $sum: 1 } } },
  ]);

  const totalPayments = paymentStats.reduce((sum, item) => sum + item.count, 0);

  const paymentMethods = { cod: 0, razorpay: 0, wallet: 0 };

  paymentStats.forEach(item => {
    const pct = totalPayments > 0 ? Math.round((item.count / totalPayments) * 100) : 0;
    if (item._id === "COD")      paymentMethods.cod      = pct;
    if (item._id === "RAZORPAY") paymentMethods.razorpay = pct;
    if (item._id === "WALLET")   paymentMethods.wallet   = pct;
  });

  /* ================================================
     RETURN RATE
     Use matchAllStatuses (not just Delivered) so
     returned orders are included in the denominator
  ================================================ */

  const totalOrdersInRange = await Order.countDocuments(matchAllStatuses);

  const returnedOrders = await Order.countDocuments({
    ...matchAllStatuses,
    orderStatus: "Returned",
  });

  const returnRate = totalOrdersInRange > 0
    ? ((returnedOrders / totalOrdersInRange) * 100).toFixed(1)
    : 0;

  /* ================================================
     RECENT ORDERS (all statuses in range)
  ================================================ */

  const recentOrders = await Order
    .find(matchAllStatuses)
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  /* ================================================
     RETURN
  ================================================ */

  return {
    totalSalesCount:      report[0]?.totalSalesCount      || 0,
    totalOrderAmount:     report[0]?.totalOrderAmount     || 0,
    totalDiscount:        report[0]?.totalDiscount        || 0,
    totalCouponDeduction: report[0]?.totalCouponDeduction || 0,
    chartLabels,
    chartData,
    topProducts,
    topCategories: categoriesWithPercentage,
    paymentMethods,
    returnRate,
    recentOrders,
    /* Pass formatted date strings back for the view */
    resolvedStartDate: rangeStart.toLocaleDateString("en-IN"),
    resolvedEndDate:   rangeEnd.toLocaleDateString("en-IN"),
  };
};

/* ================================================
   HELPER — generate complete label array so the
   chart always shows every bucket even with 0 revenue
================================================ */

function generateLabels(filterType, rangeStart, rangeEnd, chartGroupType) {

  const labels = [];

  if (chartGroupType === "hour") {
    /* 00:00 → 23:00 */
    for (let h = 0; h < 24; h++) {
      labels.push(`${String(h).padStart(2, "0")}:00`);
    }
    return labels;
  }

  if (chartGroupType === "month") {
    /* Jan → Dec (or partial range) */
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const end   = new Date(rangeEnd.getFullYear(),   rangeEnd.getMonth(),   1);
    const cur   = new Date(start);
    while (cur <= end) {
      labels.push(monthNames[cur.getMonth()]);
      cur.setMonth(cur.getMonth() + 1);
    }
    return labels;
  }

  /* chartGroupType === "day" */
  if (filterType === "monthly") {
    /* 01, 02, … last day of month */
    const daysInMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      labels.push(String(d).padStart(2, "0"));
    }
    return labels;
  }

  /* weekly or custom day-level — iterate actual dates */
  const cur = new Date(rangeStart);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(rangeEnd);
  end.setHours(0, 0, 0, 0);

  while (cur <= end) {
    const day   = String(cur.getDate()).padStart(2, "0");
    const month = cur.toLocaleString("en-GB", { month: "short" });
    labels.push(`${day} ${month}`);
    cur.setDate(cur.getDate() + 1);
  }
  return labels;
}