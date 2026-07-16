import Wallet from "../../models/Wallet.js";
import WalletTransaction from "../../models/WalletTransaction.js";

/* =========================================
   CREATE WALLET
========================================= */
export const createWallet = async (userId) => {
  return await Wallet.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: {
        balance: 0,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
    },
  );
};

/* =========================================
   GET WALLET
========================================= */
export const getWallet = async (userId) => {
  return await createWallet(userId);
};

/* =========================================
   GET BALANCE
========================================= */
export const getBalance = async (userId) => {
  const wallet = await createWallet(userId);
  return wallet.balance;
};

/* =========================================
   CREDIT WALLET
   FIX: deduplication guard prevents double
   refund on retries for full-order refunds.
   NOTE: item-level refunds pass a unique
   transactionId to distinguish them.
========================================= */
export const creditWallet = async ({
  userId,
  amount,
  transactionType,
  description = "",
  orderId = null,
  transactionId = null,
  razorpayPaymentId = null,
}) => {
  if (!amount || amount <= 0) {
    const wallet = await createWallet(userId);

    return {
      success: true,
      wallet,
    };
  }

  /* ==========================
       IDEMPOTENCY CHECK
    ========================== */

  const dedupQuery = {
    transactionType,
    type: "Credit",
  };

  if (orderId) {
    dedupQuery.orderId = orderId;
  }

  if (transactionId) {
    dedupQuery.transactionId = transactionId;
  }

  if (razorpayPaymentId) {
    dedupQuery.razorpayPaymentId = razorpayPaymentId;
  }

  if (orderId || transactionId || razorpayPaymentId) {
    const existingTransaction = await WalletTransaction.findOne(dedupQuery);

    if (existingTransaction) {
      const wallet = await createWallet(userId);

      return {
        success: true,
        wallet,
      };
    }
  }

  await createWallet(userId);

  const wallet = await Wallet.findOneAndUpdate(
    {
      userId,
    },
    {
      $inc: {
        balance: amount,
      },
    },
    {
      returnDocument: "after",
    },
  );

  await WalletTransaction.create({
    walletId: wallet._id,

    userId,

    orderId,

    transactionId,

    razorpayPaymentId,

    amount,

    type: "Credit",

    transactionType,

    description,

    balanceAfter: wallet.balance,
  });

  return {
    success: true,
    wallet,
  };
};

/* =========================================
   DEBIT WALLET
========================================= */
export const debitWallet = async ({
  userId,
  amount,
  transactionType,
  description = "",
  orderId = null,
  transactionId = null,
  razorpayPaymentId = null,
}) => {
  if (!amount || amount <= 0) {
    const wallet = await createWallet(userId);

    return {
      success: true,
      wallet,
    };
  }

  await createWallet(userId);

  /* ==========================
       IDEMPOTENCY CHECK
    ========================== */

  const dedupQuery = {
    transactionType,
    type: "Debit",
  };

  if (orderId) {
    dedupQuery.orderId = orderId;
  }

  if (transactionId) {
    dedupQuery.transactionId = transactionId;
  }

  if (razorpayPaymentId) {
    dedupQuery.razorpayPaymentId = razorpayPaymentId;
  }

  if (orderId || transactionId || razorpayPaymentId) {
    const existingTransaction = await WalletTransaction.findOne(dedupQuery);

    if (existingTransaction) {
      const wallet = await Wallet.findOne({ userId });

      return {
        success: true,
        wallet,
      };
    }
  }

  /* ==========================
       ATOMIC BALANCE CHECK
    ========================== */

  const wallet = await Wallet.findOneAndUpdate(
    {
      userId,
      balance: {
        $gte: amount,
      },
    },
    {
      $inc: {
        balance: -amount,
      },
    },
    {
      returnDocument: "after",
    },
  );

  if (!wallet) {
    return {
      success: false,
      message: "Insufficient wallet balance",
    };
  }

  await WalletTransaction.create({
    walletId: wallet._id,

    userId,

    orderId,

    transactionId,

    razorpayPaymentId,

    amount,

    type: "Debit",

    transactionType,

    description,

    balanceAfter: wallet.balance,
  });

  return {
    success: true,
    wallet,
  };
};
