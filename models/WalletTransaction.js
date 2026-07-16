import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    transactionId: {
      type: String,
      default: null,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: ["Credit", "Debit"],
      required: true,
    },

    transactionType: {
      type: String,
      enum: [
        "Refund",
        "CancellationRefund",
        "AdminCancellationRefund",
        "ReturnRefund",
        "OrderPayment",
        "OrderPaymentRefund",
        "ReferralBonus",
        "AdminAdjustment",
        "WalletTopup",
      ],
      required: true,
    },

    description: {
      type: String,
      default: "",
    },

    razorpayPaymentId: {
      type: String,

      default: null,

      index: true,
    },

    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

walletTransactionSchema.index({
  transactionType: 1,
  orderId: 1,
});

walletTransactionSchema.index({
  transactionType: 1,
  transactionId: 1,
});

walletTransactionSchema.index({
  transactionType: 1,
  razorpayPaymentId: 1,
});

const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema,
);

export default WalletTransaction;
