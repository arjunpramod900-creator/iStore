import Wallet from "../../models/Wallet.js";
import WalletTransaction from "../../models/WalletTransaction.js";

export const loadWalletService = async (
  userId,
  page = 1,
  limit = 10
) => {

  const wallet =
    await Wallet.findOne({ userId });

  const currentPage =
    Number(page) || 1;

  const skip =
    (currentPage - 1) * limit;

  const totalTransactions =
    await WalletTransaction.countDocuments({
      userId,
    });

  const transactions =
    await WalletTransaction.find({
      userId,
    })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean();

  return {

    wallet,

    transactions,

    pagination: {

      currentPage,

      totalPages:
        Math.max(
          1,
          Math.ceil(
            totalTransactions / limit
          )
        ),

      totalTransactions,

    },

  };

};