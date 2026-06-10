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

  /* DAILY */

  if (
    filterType === "daily"
  ) {

    const start =
      new Date();

    start.setHours(
      0,0,0,0
    );

    const end =
      new Date();

    end.setHours(
      23,59,59,999
    );

    matchStage.createdAt = {

      $gte: start,

      $lte: end,

    };

  }

  /* WEEKLY */

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

  /* YEARLY */

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

  /* CUSTOM */

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

          $sum:
            "$discountAmount",

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

  return report[0] || {

    totalSalesCount: 0,

    totalOrderAmount: 0,

    totalDiscount: 0,

    totalCouponDeduction: 0,

  };

};