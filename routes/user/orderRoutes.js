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
  downloadInvoice,
} from "../../controllers/user/orderController.js";

/* =========================================
   PROTECTED ORDER ROUTES
========================================= */

router.use(
  isLoggedIn,
  userBlockCheckMiddleware,
);

/* =========================================
   ORDER LIST PAGE
========================================= */

router.get(
  "/orders",
  loadOrdersPage,
);

/* =========================================
   ORDER DETAILS PAGE
========================================= */

router.get(
  "/orders/:orderId",
  loadOrderDetailsPage,
);

/* =========================================
   CANCEL FULL ORDER
========================================= */

router.post(
  "/orders/:orderId/cancel",
  cancelOrder,
);

/* =========================================
   CANCEL SINGLE ITEM
========================================= */

router.post(
  "/orders/:orderId/item/:itemId/cancel",
  cancelOrderItem,
);

/* =========================================
   RETURN ORDER
========================================= */

router.post(
  "/orders/:orderId/return",
  returnOrder,
);

/* =========================================
DOWNLOAD INVOICE
========================================= */

router.get(
"/orders/:orderId/invoice",
downloadInvoice,
);

export default router;