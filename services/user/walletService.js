import Wallet from "../../models/Wallet.js";
import WalletTransaction from "../../models/WalletTransaction.js";

import {
  createRazorpayOrder,
  verifyRazorpaySignature,
} from "./razorpayService.js";

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


export const creditWalletTopupService = async ({
  userId,
  amount,
  razorpayPaymentId,
}) => {

  let wallet =
    await Wallet.findOne({
      userId,
    });

  if (!wallet) {

    wallet =
      await Wallet.create({
        userId,
        balance: 0,
      });

  }

  wallet.balance += amount;

  await wallet.save();

  await WalletTransaction.create({

    walletId:
      wallet._id,

    userId,

    amount,

    type: "Credit",

    transactionType:
      "WalletTopup",

    razorpayPaymentId,

    description:
      `Wallet top-up via Razorpay (${razorpayPaymentId})`,

    balanceAfter:
      wallet.balance,

  });

  return {

    success: true,

    balance:
      wallet.balance,

  };

};

export const createWalletTopupOrderService =
async (
  userId,
  amount,
) => {

  if (
    !amount ||
    amount < 1
  ) {

    return {

      success: false,

      message:
        "Invalid amount",

    };

  }

  const razorpayResponse =
    await createRazorpayOrder({

      amount,

    });

  if (
    !razorpayResponse.success
  ) {

    return {

      success: false,

      message:
        "Unable to initiate payment",

    };

  }

  return {

    success: true,

    razorpayOrder:
      razorpayResponse.razorpayOrder,

  };

};

export const verifyWalletTopupPaymentService =
async ({

  userId,

  amount,

  razorpayOrderId,

  razorpayPaymentId,

  razorpaySignature,

}) => {

  const isValid =
    verifyRazorpaySignature({

      razorpayOrderId,

      razorpayPaymentId,

      razorpaySignature,

    });

  if (!isValid) {

    return {

      success: false,

      message:
        "Payment verification failed",

    };

  }
  /* =========================================
      DUPLICATE PAYMENT PROTECTION
    ========================================= */

    const existingTransaction =
      await WalletTransaction.findOne({

        razorpayPaymentId,

      });

    if (existingTransaction) {

      return {

        success: false,

        message:
          "Payment already processed",

      };

    }

  const creditResponse =
    await creditWalletTopupService({

      userId,

      amount,

      razorpayPaymentId,

    });

  if (!creditResponse.success) {

    return {

      success: false,

      message:
        "Wallet credit failed",

    };

  }

  return {

    success: true,

    balance:
      creditResponse.balance,

  };

};