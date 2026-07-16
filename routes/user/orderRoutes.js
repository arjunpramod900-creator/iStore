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
  retryOrderPay,
  loadOrderFailurePage,
} from "../../controllers/user/orderController.js";

/* ─── loadRetryCheckoutPage */
import { loadRetryCheckoutPage } from "../../controllers/user/checkoutController.js";

const auth = [isLoggedIn, userBlockCheckMiddleware];

router.use(...auth);

/* ── Order list & details ── */
router.get("/orders", loadOrdersPage);
router.get("/orders/:orderId", loadOrderDetailsPage);

/* ── Cancel ── */
router.post("/orders/:orderId/cancel", cancelOrder);
router.post("/orders/:orderId/item/:itemId/cancel", cancelOrderItem);

/* ── Return ── */
router.post("/orders/:orderId/return", returnOrder);
router.post("/orders/:orderId/item/:itemId/return", returnOrderItem);

/* ── Retry payment flow ──

*/
router.get("/orders/:orderId/retry", loadRetryCheckoutPage);
router.post("/orders/:orderId/retry-pay", retryOrderPay);
router.post("/orders/:orderId/retry-payment", retryPayment); /* legacy */

/* ── Failed Payment Page ── */
router.get("/order-failure/:orderId", loadOrderFailurePage);

/* ── Invoice ── */
router.get("/orders/:orderId/invoice", downloadInvoice);

export default router;
