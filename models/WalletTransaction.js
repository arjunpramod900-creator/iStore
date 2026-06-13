import mongoose from "mongoose";

const walletTransactionSchema =
new mongoose.Schema(
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

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "Credit",
        "Debit",
      ],
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
    },

    balanceAfter: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const WalletTransaction =
mongoose.model(
  "WalletTransaction",
  walletTransactionSchema
);

export default WalletTransaction;