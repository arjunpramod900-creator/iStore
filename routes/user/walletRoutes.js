import express from "express";

const router =
  express.Router();

import {
  isLoggedIn,
} from "../../middleware/authMiddleware.js";

import userBlockCheckMiddleware
from "../../middleware/userBlockCheckMiddleware.js";

import {
  loadWalletPage,
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

export default router;