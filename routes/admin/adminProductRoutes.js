import express from "express";

const router = express.Router();

import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
});

import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js";

import {
  loadProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  permanentDeleteProduct,
  loadProductDetails,
  getProductJson,
  addVariant,
  updateVariant,
  deleteVariant,
  restoreVariant,
  permanentDeleteVariant,
} from "../../controllers/admin/adminProductController.js";

const uploadFields = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "variantImages", maxCount: 10 },
]);

/* ============================
   PRODUCT MANAGEMENT
============================ */

router.get("/products", adminAuthMiddleware, loadProducts);

/* ============================
   ADD PRODUCT  (modal submit, JSON response)
============================ */

router.post("/products/add", adminAuthMiddleware, uploadFields, addProduct);

/* ============================
   GET PRODUCT JSON (for Edit modal population)
============================ */

router.get("/products/:id/json", adminAuthMiddleware, getProductJson);

/* ============================
   UPDATE PRODUCT  (modal submit, JSON response)
============================ */

router.post(
  "/products/edit/:id",
  adminAuthMiddleware,
  uploadFields,
  updateProduct,
);

/* ============================
   PRODUCT DETAILS
============================ */

router.get("/products/:id", adminAuthMiddleware, loadProductDetails);

/* ============================
   DELETE / RESTORE / PERMANENT DELETE
   (paths now match the fetch() calls in product-management.ejs)
============================ */

router.patch("/delete-product/:id", adminAuthMiddleware, deleteProduct);

router.patch("/restore-product/:id", adminAuthMiddleware, restoreProduct);

router.delete(
  "/permanent-delete-product/:id",
  adminAuthMiddleware,
  permanentDeleteProduct,
);

/* ============================
   VARIANTS
============================ */

router.post(
  "/products/:productId/variants",
  adminAuthMiddleware,
  uploadFields,
  addVariant,
);

router.patch(
  "/variants/:variantId",
  adminAuthMiddleware,
  uploadFields,
  updateVariant,
);

router.patch("/variants/:variantId/delete", adminAuthMiddleware, deleteVariant);

router.patch(
  "/variants/:variantId/restore",
  adminAuthMiddleware,
  restoreVariant,
);

router.delete(
  "/variants/:variantId",
  adminAuthMiddleware,
  permanentDeleteVariant,
);

export default router;
