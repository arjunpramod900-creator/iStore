import Order from "../../models/Order.js";

export const getSalesReportService = async (filterType, startDate, endDate) => {

  const today = new Date();

  let rangeStart;
  let rangeEnd;

  if (filterType === "daily") {
    rangeStart = new Date();
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date();
    rangeEnd.setHours(23, 59, 59, 999);

  } else if (filterType === "weekly") {
    rangeStart = new Date();
    rangeStart.setDate(today.getDate() - 6);
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
    // fallback — last 7 days
    rangeStart = new Date();
    rangeStart.setDate(today.getDate() - 6);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date();
    rangeEnd.setHours(23, 59, 59, 999);
  }

  const dateRange = { $gte: rangeStart, $lte: rangeEnd };

  /* ─────────────────────────────────────────────────────
     CHART FORMAT
  ───────────────────────────────────────────────────── */
  let chartDateFormat;
  let chartGroupType;

  if (filterType === "daily") {
    chartDateFormat = "%H:00";
    chartGroupType  = "hour";
  } else if (filterType === "weekly") {
    chartDateFormat = "%d %b";
    chartGroupType  = "day";
  } else if (filterType === "monthly") {
    chartDateFormat = "%d";
    chartGroupType  = "day";
  } else if (filterType === "yearly") {
    chartDateFormat = "%b";
    chartGroupType  = "month";
  } else {
    // custom
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

  /* ─────────────────────────────────────────────────────
     SALES SUMMARY
     grossRevenue      = total collected from ALL orders placed (Delivered + Returned)
                         Uses pricingSnapshot.originalFinalAmount — immutable, never zeroed.
     deliveredRevenue  = gross from Delivered orders only (used for AOV)
     totalRefundAmount = money paid back for Returned orders
     netRevenue        = grossRevenue − totalRefundAmount
     totalDiscount     = offer + coupon savings on Delivered orders
  ───────────────────────────────────────────────────── */

  const totalSalesCount = await Order.countDocuments({
    orderStatus: "Delivered",
    createdAt:   dateRange,
  });

  const totalReturnedCount = await Order.countDocuments({
    orderStatus: "Returned",
    createdAt:   dateRange,
  });

  const totalCompletedOrders = totalSalesCount + totalReturnedCount;

  // Single pass: gross from Delivered+Returned, delivered-only revenue for AOV, discounts
  const deliveredSummary = await Order.aggregate([
    {
      $match: {
        orderStatus: { $in: ["Delivered", "Returned"] },
        createdAt:   dateRange,
      },
    },
    {
      $group: {
        _id: null,
        // What customers paid across ALL completed orders (the revenue the store received)
        grossRevenue: {
          $sum: {
            $ifNull: ["$pricingSnapshot.originalFinalAmount", "$finalAmount"],
          },
        },
        // Revenue from Delivered-only orders — used for AOV so returns don't inflate it
        deliveredRevenue: {
          $sum: {
            $cond: [
              { $eq: ["$orderStatus", "Delivered"] },
              { $ifNull: ["$pricingSnapshot.originalFinalAmount", "$finalAmount"] },
              0,
            ],
          },
        },
        // Discounts given (on delivered orders only — returned ones never "kept" the discount)
        totalOfferDiscount: {
          $sum: {
            $cond: [
              { $eq: ["$orderStatus", "Delivered"] },
              { $ifNull: ["$pricingSnapshot.originalOfferDiscount", "$offerDiscount"] },
              0,
            ],
          },
        },
        totalCouponDiscount: {
          $sum: {
            $cond: [
              { $eq: ["$orderStatus", "Delivered"] },
              { $ifNull: ["$pricingSnapshot.originalCouponDiscount", "$couponDiscount"] },
              0,
            ],
          },
        },
      },
    },
  ]);

  const refundSummary = await Order.aggregate([
    {
      $match: {
        orderStatus: "Returned",
        createdAt:   dateRange,
      },
    },
    {
      $group: {
        _id: null,
        // Use pricingSnapshot — works for COD and digital payments equally.
        // order.refundAmount is 0 for COD returns (no digital transaction),
        // but the revenue reversal should always equal what the customer originally paid.
        refundAmount: {
          $sum: { $ifNull: ["$pricingSnapshot.originalFinalAmount", "$finalAmount"] },
        },
      },
    },
  ]);

  const grossRevenue        = deliveredSummary[0]?.grossRevenue        || 0;
  const deliveredRevenue    = deliveredSummary[0]?.deliveredRevenue     || 0;
  const totalRefundAmount   = refundSummary[0]?.refundAmount           || 0;
  const netRevenue          = grossRevenue - totalRefundAmount;
  const totalOfferDiscount  = deliveredSummary[0]?.totalOfferDiscount  || 0;
  const totalCouponDiscount = deliveredSummary[0]?.totalCouponDiscount || 0;
  const totalDiscount       = totalOfferDiscount + totalCouponDiscount;

  // AOV = delivered revenue ÷ delivered order count (excludes returned orders)
  const avgOrderValue = totalSalesCount > 0
    ? Math.round(deliveredRevenue / totalSalesCount)
    : 0;

  // Return rate: returned / (delivered + returned) × 100
  const returnRate = totalCompletedOrders > 0
    ? ((totalReturnedCount / totalCompletedOrders) * 100).toFixed(1)
    : "0.0";

  /* ─────────────────────────────────────────────────────
     REVENUE CHART
     Net revenue per time bucket: delivered gross − refunds.
     Clamped to 0 — chart never goes negative.
  ───────────────────────────────────────────────────── */
  const rawChart = await Order.aggregate([
    {
      $match: {
        orderStatus: { $in: ["Delivered", "Returned"] },
        createdAt:   dateRange,
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format:   chartDateFormat,
            date:     "$createdAt",
            timezone: "Asia/Kolkata",
          },
        },
        grossRevenue: {
          $sum: {
            $cond: [
              { $eq: ["$orderStatus", "Delivered"] },
              { $ifNull: ["$pricingSnapshot.originalFinalAmount", "$finalAmount"] },
              0,
            ],
          },
        },
        refundAmount: {
          $sum: {
            $cond: [
              { $eq: ["$orderStatus", "Returned"] },
              // pricingSnapshot — same logic as summary: works for COD + digital
              { $ifNull: ["$pricingSnapshot.originalFinalAmount", "$finalAmount"] },
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        // Clamp to 0 so chart bars/lines are never negative
        revenue: {
          $max: [0, { $subtract: ["$grossRevenue", "$refundAmount"] }],
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const revenueMap  = {};
  rawChart.forEach(item => { revenueMap[item._id] = item.revenue; });

  const chartLabels = generateLabels(filterType, rangeStart, rangeEnd, chartGroupType);
  const chartData   = chartLabels.map(label => revenueMap[label] || 0);

  /* ─────────────────────────────────────────────────────
     TOP PRODUCTS — Delivered orders only
     units   = total quantity of items delivered
     revenue = sum of item finalPrice for delivered items
  ───────────────────────────────────────────────────── */
  const topProducts = await Order.aggregate([
    {
      $match: {
        orderStatus: "Delivered",
        createdAt:   dateRange,
      },
    },
    { $unwind: "$items" },
    { $match: { "items.itemStatus": { $ne: "Cancelled" } } },
    {
      $group: {
        _id:     "$items.productId",
        name:    { $first: "$items.productName" },
        units:   { $sum: "$items.quantity" },
        revenue: {
          $sum: {
            $ifNull: [
              "$items.finalPrice",
              { $multiply: ["$items.price", "$items.quantity"] },
            ],
          },
        },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  /* ─────────────────────────────────────────────────────
     TOP CATEGORIES
     Revenue = item finalPrice (post-offer-discount) minus item refunds.
     Only non-cancelled items across Delivered+Returned orders.
  ───────────────────────────────────────────────────── */
  const topCategoriesRaw = await Order.aggregate([
    {
      $match: {
        orderStatus: { $in: ["Delivered", "Returned"] },
        createdAt:   dateRange,
      },
    },
    { $unwind: "$items" },
    {
      $match: {
        "items.itemStatus": { $ne: "Cancelled" },
      },
    },
    {
      $lookup: {
        from:         "products",
        localField:   "items.productId",
        foreignField: "_id",
        as:           "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: false } },
    {
      $lookup: {
        from:         "categories",
        localField:   "product.categoryId",
        foreignField: "_id",
        as:           "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: "$category.name",

        // Revenue from SOLD (non-returned) items only — always positive
        revenue: {
          $sum: {
            $cond: [
              { $ne: ["$items.itemStatus", "Returned"] },
              { $ifNull: ["$items.finalPrice", { $multiply: ["$items.price", "$items.quantity"] }] },
              0,
            ],
          },
        },
      },
    },
    {
      $project: {
        _id:     1,
        revenue: 1,
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: 10 },
  ]);

  const totalCategoryRevenue = topCategoriesRaw.reduce(
    (sum, cat) => sum + (cat.revenue || 0), 0
  );

  const topCategories = topCategoriesRaw.map(cat => ({
    ...cat,
    percentage: totalCategoryRevenue > 0
      ? Math.round((cat.revenue / totalCategoryRevenue) * 100)
      : 0,
  }));

  /* ─────────────────────────────────────────────────────
     PAYMENT METHODS
     Percentage and raw count breakdown (Delivered + Returned).
  ───────────────────────────────────────────────────── */
  const paymentStatsRaw = await Order.aggregate([
    {
      $match: {
        orderStatus: { $in: ["Delivered", "Returned"] },
        createdAt:   dateRange,
      },
    },
    {
      $group: {
        _id:   "$paymentMethod",
        count: { $sum: 1 },
      },
    },
  ]);

  const totalPaymentOrders = paymentStatsRaw.reduce((s, i) => s + i.count, 0);

  const paymentMethods = { cod: 0, razorpay: 0, wallet: 0 };
  const paymentCounts  = { cod: 0, razorpay: 0, wallet: 0 };

  paymentStatsRaw.forEach(item => {
    const pct = totalPaymentOrders > 0
      ? Math.round((item.count / totalPaymentOrders) * 100)
      : 0;
    if (item._id === "COD")      { paymentMethods.cod      = pct; paymentCounts.cod      = item.count; }
    if (item._id === "RAZORPAY") { paymentMethods.razorpay = pct; paymentCounts.razorpay = item.count; }
    if (item._id === "WALLET")   { paymentMethods.wallet   = pct; paymentCounts.wallet   = item.count; }
  });

  /* ─────────────────────────────────────────────────────
     RECENT ORDERS
     Latest 10 orders across ALL statuses in the date range.
     displayAmount = what the customer originally paid (immutable
     snapshot), so returned orders never show ₹0.
  ───────────────────────────────────────────────────── */
  const recentOrderDocs = await Order
    .find({ createdAt: dateRange })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const recentOrders = recentOrderDocs.map(order => ({
    ...order,
    displayAmount:
      order.pricingSnapshot?.originalFinalAmount ??
      order.finalAmount ??
      0,
  }));

  /* ─────────────────────────────────────────────────────
     RETURN
  ───────────────────────────────────────────────────── */
  return {
    // Order counts
    totalSalesCount,          // delivered orders (true sales)
    totalReturnedCount,       // returned orders
    totalCompletedOrders,     // delivered + returned

    // Revenue
    grossRevenue,             // sum paid on delivered orders
    totalRefundAmount,        // total refunded for returned orders
    netRevenue,               // grossRevenue − totalRefundAmount
    totalOrderAmount: netRevenue,

    // Discounts
    totalDiscount,            // total offer + coupon savings
    totalOfferDiscount,       // offer portion
    totalCouponDiscount,      // coupon portion
    totalCouponDeduction: totalCouponDiscount,

    // Averages / rates
    avgOrderValue,            // gross revenue per delivered order
    returnRate,               // % of completed orders returned

    // Chart
    chartLabels,
    chartData,

    // Tables
    topProducts,              // { name, units, returnedUnits, revenue }
    topCategories,            // { _id, revenue, percentage }
    paymentMethods,           // { cod, razorpay, wallet } percentages
    paymentCounts,            // { cod, razorpay, wallet } raw counts

    // Recent orders
    recentOrders,             // includes displayAmount

    // Formatted date labels for the view
    resolvedStartDate: rangeStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    resolvedEndDate:   rangeEnd.toLocaleDateString("en-IN",   { day: "2-digit", month: "short", year: "numeric" }),
  };
};

/* ─────────────────────────────────────────────────────
   LABEL GENERATOR
   Returns an ordered array of axis labels matching the
   MongoDB $dateToString format strings used above.
───────────────────────────────────────────────────── */
function generateLabels(filterType, rangeStart, rangeEnd, chartGroupType) {

  const labels = [];

  if (chartGroupType === "hour") {
    for (let h = 0; h < 24; h++) {
      labels.push(`${String(h).padStart(2, "0")}:00`);
    }
    return labels;
  }

  if (chartGroupType === "month") {
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (filterType === "yearly") {
      // Full year — always show all 12 months
      for (let m = 0; m < 12; m++) {
        labels.push(monthNames[m]);
      }
    } else {
      // Custom range spanning multiple months
      const start = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
      const end   = new Date(rangeEnd.getFullYear(),   rangeEnd.getMonth(),   1);
      const cur   = new Date(start);
      while (cur <= end) {
        labels.push(monthNames[cur.getMonth()]);
        cur.setMonth(cur.getMonth() + 1);
      }
    }
    return labels;
  }

  if (filterType === "monthly") {
    const daysInMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      labels.push(String(d).padStart(2, "0"));
    }
    return labels;
  }

  // Day-by-day (weekly or short custom range)
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