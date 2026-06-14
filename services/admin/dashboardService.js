import Order from "../../models/Order.js";
import User from "../../models/User.js";
import Product from "../../models/Product.js";
import Variant from "../../models/Variant.js";

export const getDashboardDataService =
async (filter = "weekly") => {

  /* ==========================
     FILTER LOGIC
  ========================== */

  let matchStage = {
    orderStatus: "Delivered",
  };

  const today = new Date();

  if (filter === "daily") {

    const start = new Date();

    start.setHours(
      0,
      0,
      0,
      0
    );

    matchStage.createdAt = {
      $gte: start,
    };

  }
  else if (filter === "weekly") {

  const start = new Date();

  start.setDate(
    start.getDate() - 7
  );

  matchStage.createdAt = {
    $gte: start,
  };

}

  else if (filter === "monthly") {

    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    matchStage.createdAt = {
      $gte: start,
    };

  }

  else if (filter === "yearly") {

    const start = new Date(
      today.getFullYear(),
      0,
      1
    );

    matchStage.createdAt = {
      $gte: start,
    };

  }

  /* ==========================
     TOTAL REVENUE
  ========================== */

const revenueResult =
await Order.aggregate([

  {
    $match: matchStage,
  },

  {
    $group: {
      _id: null,

      totalRevenue: {
        $sum: "$finalAmount",
      },
    },
  },

]);
  /* ==========================
     TOTAL ORDERS
  ========================== */

  const totalOrders =
  await Order.countDocuments();

  /* ==========================
     TOTAL CUSTOMERS
  ========================== */

  const totalCustomers =
  await User.countDocuments({
    isBlocked: false,
  });

  /* ==========================
     TOTAL PRODUCTS
  ========================== */

  const totalProducts =
  await Product.countDocuments({
    isDeleted: false,
  });

  /* ==========================
     RECENT ORDERS
  ========================== */

  const recentOrders =
await Order.find(matchStage)

    .populate(
      "userId",
      "fullName"
    )

    .sort({
      createdAt: -1,
    })

    .limit(5)

    .lean();

  /* ==========================
     REVENUE CHART DATA
  ========================== */

  const revenueChart =

  await Order.aggregate([

    {
      $match: matchStage,
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
          $sum: "$finalAmount",
        },

      },
    },

    {
      $sort: {
        "_id": 1,
      },
    },

    {
      $limit: 7,
    },

  ]);

  /* ==========================
     TOP SELLING PRODUCTS
  ========================== */

  const topProducts =

  await Order.aggregate([

{
  $match: matchStage,
},

    {
      $unwind: "$items",
    },

    {
      $group: {

        _id: "$items.productId",

        productName: {
          $first: "$items.productName",
        },

        unitsSold: {
          $sum: "$items.quantity",
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
        unitsSold: -1,
      },
    },

    {
      $limit: 10,
    },

  ]);

  /* ==========================
     LOW STOCK ALERTS
  ========================== */

  const stockAlerts =

  await Variant.find({

    isDeleted: false,

    isActive: true,

    stock: {
      $lte: 5,
    },

  })

    .populate(
      "productId",
      "name"
    )

    .sort({
      stock: 1,
    })

    .limit(5)

    .lean();

  /* ==========================
     TOP CATEGORIES
  ========================== */

  const topCategories =

  await Order.aggregate([

{
  $match: matchStage,
},

    {
      $unwind: "$items",
    },

    {
      $lookup: {

        from: "products",

        localField:
          "items.productId",

        foreignField:
          "_id",

        as: "product",

      },
    },

    {
      $unwind: "$product",
    },

    {
      $lookup: {

        from: "categories",

        localField:
          "product.categoryId",

        foreignField:
          "_id",

        as: "category",

      },
    },

    {
      $unwind: "$category",
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

    (category) => ({

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

  return {

    totalRevenue:
      revenueResult[0]?.totalRevenue || 0,

    totalOrders,

    totalCustomers,

    totalProducts,

    recentOrders,

    revenueChart,

    topProducts,

    stockAlerts,

    topCategories:
      categoriesWithPercentage,

  };

};