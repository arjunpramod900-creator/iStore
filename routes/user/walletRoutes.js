import express from "express";

const router = express.Router();

import { isLoggedIn } from "../../middleware/authMiddleware.js";

import userBlockCheckMiddleware from "../../middleware/userBlockCheckMiddleware.js";

import {
  loadWalletPage,
  createWalletTopupOrder,
  verifyWalletTopupPayment,
} from "../../controllers/user/walletController.js";

/* =========================================
   PROTECTED WALLET ROUTES
========================================= */

router.use(
  isLoggedIn,

  userBlockCheckMiddleware,
);

/* =========================================
   WALLET PAGE
========================================= */

router.get(
  "/wallet",

  loadWalletPage,
);

/* =========================================
   CREATE WALLET TOPUP ORDER
========================================= */

router.post(
  "/wallet/create-order",

  createWalletTopupOrder,
);

/* =========================================
   VERIFY WALLET TOPUP PAYMENT
========================================= */

router.post(
  "/wallet/verify-payment",

  verifyWalletTopupPayment,
);

export default router;
