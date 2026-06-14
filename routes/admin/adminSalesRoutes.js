import express from "express";

const router = express.Router();

import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js";

import {
  loadSalesReport,
} from "../../controllers/admin/adminSalesController.js";

import {
  downloadSalesReportPDF,
} from "../../controllers/admin/salesReportController.js";

import {
  downloadSalesReportExcel,
} from "../../controllers/admin/excelReportController.js";

/* ============================
   SALES REPORT
============================ */

router.get(
  "/sales-report",

  adminAuthMiddleware,

  loadSalesReport,
);

/* ============================
   DOWNLOAD SALES REPORT PDF
============================ */

router.get(

  "/sales-report/pdf",

  adminAuthMiddleware,

  downloadSalesReportPDF,

);

/* ============================
   DOWNLOAD SALES REPORT EXCEL
============================ */

router.get(

  "/sales-report/excel",

  adminAuthMiddleware,

  downloadSalesReportExcel,

);

export default router;