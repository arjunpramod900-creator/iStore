import express from "express";

const router = express.Router();

import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js";

import {
  loadSalesReport,
} from "../../controllers/admin/adminSalesController.js";

/* ============================
   SALES REPORT
============================ */

router.get(
  "/sales-report",

  adminAuthMiddleware,

  loadSalesReport,
);

export default router;