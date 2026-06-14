import Order from "../../models/Order.js";

export const getSalesReportService =
async (
  filterType,
  startDate,
  endDate,
) => {

  let matchStage = {

    orderStatus:
      "Delivered",

  };

  const today =
    new Date();

  /* ==========================
     DAILY
  ========================== */

  if (
    filterType === "daily"
  ) {

    const start =
      new Date();

    start.setHours(
      0, 0, 0, 0
    );

    const end =
      new Date();

    end.setHours(
      23, 59, 59, 999
    );

    matchStage.createdAt = {

      $gte: start,

      $lte: end,

    };

  }

  /* ==========================
     WEEKLY
  ========================== */

  else if (
    filterType === "weekly"
  ) {

    const start =
      new Date();

    start.setDate(
      today.getDate() - 7
    );

    matchStage.createdAt = {

      $gte: start,

      $lte: today,

    };

  }

  /* ==========================
     MONTHLY
  ========================== */

  else if (
    filterType === "monthly"
  ) {

    const start =
      new Date(

        today.getFullYear(),

        today.getMonth(),

        1

      );

    matchStage.createdAt = {

      $gte: start,

      $lte: today,

    };

  }

  /* ==========================
     YEARLY
  ========================== */

  else if (
    filterType === "yearly"
  ) {

    const start =
      new Date(
        today.getFullYear(),
        0,
        1
      );

    matchStage.createdAt = {

      $gte: start,

      $lte: today,

    };

  }

  /* ==========================
     CUSTOM
  ========================== */

  else if (

    filterType === "custom"

    &&

    startDate

    &&

    endDate

  ) {

    matchStage.createdAt = {

      $gte:
        new Date(startDate),

      $lte:
        new Date(endDate),

    };

  }

  /* ==========================
     SUMMARY REPORT
  ========================== */

  const report =
  await Order.aggregate([

    {
      $match:
      matchStage,
    },

    {

      $group: {

        _id: null,

        totalSalesCount: {

          $sum: 1,

        },

        totalOrderAmount: {

          $sum:
          "$finalAmount",

        },

 totalDiscount: {
  $sum: {
    $add: [
      "$offerDiscount",
      "$couponDiscount"
    ]
  }
},

        totalCouponDeduction: {

          $sum: {

            $cond: [

              {

                $and: [

                  {

                    $ne: [
                      "$couponCode",
                      null,
                    ],

                  },

                  {

                    $ne: [
                      "$couponCode",
                      "",
                    ],

                  },

                ],

              },

              "$discountAmount",

              0,

            ],

          },

        },

      },

    },

  ]);

  /* ==========================
     REVENUE CHART
  ========================== */

  const chartResult =
  await Order.aggregate([

    {
      $match:
      matchStage,
    },

    {

      $group: {

        _id: {

          $dateToString: {

            format: "%d-%m",

            date: "$createdAt",

          },

        },

        revenue: {

          $sum:
          "$finalAmount",

        },

      },

    },

    {

      $sort: {

        _id: 1,

      },

    },

  ]);

  const chartLabels =
  chartResult.map(
    item => item._id
  );

  const chartData =
  chartResult.map(
    item => item.revenue
  );

  /* ==========================
     TOP PRODUCTS
  ========================== */

  const topProducts =
  await Order.aggregate([

    {
      $match:
      matchStage,
    },

    {
      $unwind:
      "$items",
    },

    {

      $group: {

        _id:
        "$items.productId",

        name: {

          $first:
          "$items.productName",

        },

        units: {

          $sum:
          "$items.quantity",

        },

        revenue: {

          $sum: {

            $multiply: [

              "$items.quantity",

              "$items.price",

            ],

          },

        },

      },

    },

    {

      $sort: {

        units: -1,

      },

    },

    {

      $limit: 10,

    },

  ]);

  /* ==========================
     TOP CATEGORIES
  ========================== */

  const topCategories =
  await Order.aggregate([

    {
      $match:
      matchStage,
    },

    {
      $unwind:
      "$items",
    },

    {

      $lookup: {

        from:
        "products",

        localField:
        "items.productId",

        foreignField:
        "_id",

        as:
        "product",

      },

    },

    {
      $unwind:
      "$product",
    },

    {

      $lookup: {

        from:
        "categories",

        localField:
        "product.categoryId",

        foreignField:
        "_id",

        as:
        "category",

      },

    },

    {
      $unwind:
      "$category",
    },

    {

      $group: {

        _id:
        "$category.name",

        revenue: {

          $sum: {

            $multiply: [

              "$items.quantity",

              "$items.price",

            ],

          },

        },

      },

    },

    {

      $sort: {

        revenue: -1,

      },

    },

    {

      $limit: 10,

    },

  ]);

  const totalCategoryRevenue =
  topCategories.reduce(

    (sum, category) =>

      sum + category.revenue,

    0

  );

  const categoriesWithPercentage =
  topCategories.map(

    category => ({

      ...category,

      percentage:

      totalCategoryRevenue > 0

      ? Math.round(

        (
          category.revenue
          /
          totalCategoryRevenue
        ) * 100

      )

      : 0,

    })

  );
/* ==========================
   PAYMENT METHODS
========================== */

const paymentStats =
await Order.aggregate([

  {
    $match: matchStage,
  },

  {
    $group: {

      _id: "$paymentMethod",

      count: {
        $sum: 1,
      },

    },
  },

]);

const totalPayments =
paymentStats.reduce(

  (sum, item) =>

    sum + item.count,

  0

);

const paymentMethods = {

  cod: 0,

  razorpay: 0,

  wallet: 0,

};

paymentStats.forEach(item => {

  const percentage =
  totalPayments > 0

  ? Math.round(
      (item.count / totalPayments) * 100
    )

  : 0;

  if (item._id === "COD") {
    paymentMethods.cod =
    percentage;
  }

  if (item._id === "RAZORPAY") {
    paymentMethods.razorpay =
    percentage;
  }

  if (item._id === "WALLET") {
    paymentMethods.wallet =
    percentage;
  }

});

/* ==========================
   RETURN RATE
========================== */

const totalOrdersForReturn =
await Order.countDocuments(
  matchStage
);

const returnedOrders =
await Order.countDocuments({

  ...matchStage,

  orderStatus:
  "Returned",

});

const returnRate =

totalOrdersForReturn > 0

? (

    (
      returnedOrders
      /
      totalOrdersForReturn
    ) * 100

  ).toFixed(1)

: 0;

  /* ==========================
     RECENT ORDERS
  ========================== */

  const recentOrders =
  await Order.find(
    matchStage
  )

  .sort({

    createdAt: -1,

  })

  .limit(10)

  .lean();

  /* ==========================
     RETURN
  ========================== */

return {

  totalSalesCount:
    report[0]?.totalSalesCount || 0,

  totalOrderAmount:
    report[0]?.totalOrderAmount || 0,

  totalDiscount:
    report[0]?.totalDiscount || 0,

  totalCouponDeduction:
    report[0]?.totalCouponDeduction || 0,

  chartLabels,

  chartData,

  topProducts,

  topCategories:
  categoriesWithPercentage,

  paymentMethods,

  returnRate,

  recentOrders,

};

};