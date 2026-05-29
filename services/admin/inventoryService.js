import Variant from "../../models/Variant.js";

/* ============================
   LOAD INVENTORY
============================ */

export const loadInventoryService = async (query) => {

  const currentPage =
    Number(query.page) || 1;

  const limit = 10;

  const skip =
    (currentPage - 1) * limit;

  const search =
    query.search || "";

  const stockStatus =
    query.stockStatus || "";

  const sort =
    query.sort || "newest";

  /* FILTER */

  let filter = {
    isDeleted: false,
  };

  /* SEARCH */

  if (search) {

    filter.SKU = {
      $regex: search,
      $options: "i",
    };

  }

  /* STOCK STATUS */

  if (stockStatus === "out") {

    filter.stock = 0;

  }

  if (stockStatus === "critical") {

    filter.stock = {
      $lte: 5,
    };

  }

  if (stockStatus === "low") {

    filter.stock = {
      $gt: 5,
      $lte: 10,
    };

  }

  if (stockStatus === "healthy") {

    filter.stock = {
      $gt: 10,
    };

  }

  /* SORTING */

  let sortOption = {
    createdAt: -1,
  };

  if (sort === "newest") {

    sortOption = {
      createdAt: -1,
    };

  }

  if (sort === "oldest") {

    sortOption = {
      createdAt: 1,
    };

  }

  if (sort === "stockHigh") {

    sortOption = {
      stock: -1,
    };

  }

  if (sort === "stockLow") {

    sortOption = {
      stock: 1,
    };

  }

  /* INVENTORY LIST */

  const variants =
    await Variant.find(filter)

      .populate(
        "productId"
      )

      .sort(sortOption)

      .skip(skip)

      .limit(limit)

      .lean();

  /* INVENTORY VALUE */

  variants.forEach((variant) => {

    variant.inventoryValue =
      variant.stock *
      variant.price;

  });

  /* TOTAL */

  const totalVariants =
    await Variant.countDocuments(
      filter
    );

  const totalPages =
    Math.ceil(
      totalVariants / limit
    );

  /* DASHBOARD STATS */

  const allVariants =
    await Variant.find({
      isDeleted: false,
    });

  const totalUnits =
    allVariants.reduce(

      (acc, item) =>

        acc + item.stock,

      0
    );

  const inventoryValue =
    allVariants.reduce(

      (acc, item) =>

        acc +
        (
          item.stock *
          item.price
        ),

      0
    );

  const lowStockCount =
    await Variant.countDocuments({

      isDeleted: false,

      stock: {
        $lte: 10,
      },

    });

  const outOfStockCount =
    await Variant.countDocuments({

      isDeleted: false,

      stock: 0,

    });



    const lowStockVariants =
  await Variant.find({

    isDeleted: false,

    stock: {
      $lte: 10
    }

  })

  .populate("productId")

  .sort({
    stock: 1
  })

  .limit(5)

  .lean();

  return {

    variants,

    lowStockVariants,

    currentPage,

    totalPages,

    totalVariants,

    limit,

    search,

    stockStatus,

    sort,

    stats: {

      totalUnits,

      inventoryValue,

      lowStockCount,

      outOfStockCount,

    },

  };

};