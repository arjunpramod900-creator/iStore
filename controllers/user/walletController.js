import {
  loadWalletService,
  createWalletTopupOrderService,
  verifyWalletTopupPaymentService,
} from "../../services/user/walletService.js";

/* =========================================
   LOAD WALLET PAGE
========================================= */

export const loadWalletPage = async (req, res) => {
  try {
    const userId = req.session.userId;

    const { page = 1 } = req.query;

    const response = await loadWalletService(userId, page);

    res.render("user/wallet", {
      page: "wallet",

      wallet: response.wallet,

      transactions: response.transactions,

      recentRefunds: response.recentRefunds,

      pagination: response.pagination,

      razorpayKey: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.log("Load Wallet Error:", error);

    return res.redirect("/profile");
  }
};

/* =========================================
   CREATE WALLET TOPUP ORDER
========================================= */

export const createWalletTopupOrder = async (req, res) => {
  try {
    const userId = req.session.userId;

    const { amount } = req.body;

    const response = await createWalletTopupOrderService(
      userId,

      Number(amount),
    );

    return res.json(response);
  } catch (error) {
    console.log("Create Wallet Topup Error:", error);

    return res.status(500).json({
      success: false,

      message: "Failed to create payment",
    });
  }
};

/* =========================================
   VERIFY WALLET TOPUP
========================================= */

export const verifyWalletTopupPayment = async (req, res) => {
  try {
    const userId = req.session.userId;

    const {
      amount,

      razorpay_order_id,

      razorpay_payment_id,

      razorpay_signature,
    } = req.body;

    const response = await verifyWalletTopupPaymentService({
      userId,

      amount: Number(amount),

      razorpayOrderId: razorpay_order_id,

      razorpayPaymentId: razorpay_payment_id,

      razorpaySignature: razorpay_signature,
    });

    return res.json(response);
  } catch (error) {
    console.log("Verify Wallet Topup Error:", error);

    return res.status(500).json({
      success: false,

      message: "Verification failed",
    });
  }
};
