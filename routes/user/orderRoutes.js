import express from "express";

const router = express.Router();

import { isLoggedIn } from "../../middleware/authMiddleware.js";
import userBlockCheckMiddleware from "../../middleware/userBlockCheckMiddleware.js";

import {
  loadOrdersPage,
  loadOrderDetailsPage,
  cancelOrder,
  cancelOrderItem,
  returnOrder,
  returnOrderItem,
  downloadInvoice,
  retryPayment,
} from "../../controllers/user/orderController.js";

/* =========================================
   PROTECTED ORDER ROUTES
========================================= */

router.use(isLoggedIn, userBlockCheckMiddleware);

router.get("/orders",          loadOrdersPage);
router.get("/orders/:orderId", loadOrderDetailsPage);

router.post("/orders/:orderId/cancel",              cancelOrder);
router.post("/orders/:orderId/item/:itemId/cancel", cancelOrderItem);
router.post("/orders/:orderId/return",              returnOrder);
router.post("/orders/:orderId/item/:itemId/return", returnOrderItem);

/* =========================================
   RETRY RAZORPAY PAYMENT
========================================= */
router.post("/orders/:orderId/retry-payment", retryPayment);

router.get("/orders/:orderId/invoice", downloadInvoice);

export default router;