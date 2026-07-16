import express from "express";

import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js";

import upload from "../../middleware/multer.js";

import { renderAdminDashboard } from "../../controllers/admin/adminDashboardController.js";

import {
  loadUsers,
  toggleBlockUser,
  viewUserDetails,
  deleteUser,
} from "../../controllers/admin/adminUserController.js";

import {
  loadCategories,
  renderAddCategory,
  addCategory,
  renderEditCategory,
  updateCategory,
  deleteCategory,
  restoreCategory,
  permanentDeleteCategory,
} from "../../controllers/admin/adminCategoryController.js";

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

import {
  loadOrders,
  viewOrderDetails,
  updateOrderStatus,
  updateItemStatus,
  handleReturnRequest,
  handleItemReturnRequest,
} from "../../controllers/admin/adminOrderController.js";

import {
  loadInventory,
  updateVariantStock,
} from "../../controllers/admin/adminInventoryController.js";

const router = express.Router();

/* ============================
   DASHBOARD
============================ */

router.get(
  "/dashboard",

  adminAuthMiddleware,

  renderAdminDashboard,
);

/* ============================
   USER MANAGEMENT
============================ */

router.get(
  "/users",

  adminAuthMiddleware,

  loadUsers,
);

router.get(
  "/users/:id",

  adminAuthMiddleware,

  viewUserDetails,
);

router.patch(
  "/block-user/:id",

  adminAuthMiddleware,

  toggleBlockUser,
);

router.delete(
  "/users/delete/:id",

  adminAuthMiddleware,

  deleteUser,
);

/* ============================
   CATEGORY MANAGEMENT
============================ */

router.get(
  "/categories",

  adminAuthMiddleware,

  loadCategories,
);

router.get(
  "/add-category",

  adminAuthMiddleware,

  renderAddCategory,
);

router.post(
  "/add-category",

  adminAuthMiddleware,

  upload.single("image"),

  addCategory,
);

/* ============================
   EDIT CATEGORY
============================ */

router.get(
  "/edit-category/:id",

  adminAuthMiddleware,

  renderEditCategory,
);

router.post(
  "/edit-category/:id",

  adminAuthMiddleware,

  upload.single("image"),

  updateCategory,
);

/* ============================
   SOFT DELETE CATEGORY
============================ */

router.patch(
  "/delete-category/:id",

  adminAuthMiddleware,

  deleteCategory,
);

/* ============================
   RESTORE CATEGORY
============================ */

router.patch(
  "/restore-category/:id",

  adminAuthMiddleware,

  restoreCategory,
);

/* ============================
   PERMANENT DELETE CATEGORY
============================ */

router.delete(
  "/permanent-delete-category/:id",

  adminAuthMiddleware,

  permanentDeleteCategory,
);

/* ============================
   PRODUCT MANAGEMENT
============================ */

router.get(
  "/products",

  adminAuthMiddleware,

  loadProducts,
);

/* ============================
   ADD PRODUCT (modal submit, JSON response)
============================ */

router.post(
  "/products/add",

  adminAuthMiddleware,

  upload.fields([
    {
      name: "thumbnail",

      maxCount: 1,
    },

    {
      name: "variantImages",

      maxCount: 10,
    },
  ]),

  addProduct,
);

/* ============================
   GET PRODUCT JSON (for Edit modal population)
   Must come before "/products/:id" below, otherwise
   Express matches :id to "json" segment incorrectly.
============================ */

router.get(
  "/products/:id/json",

  adminAuthMiddleware,

  getProductJson,
);

/* ============================
   UPDATE PRODUCT (modal submit, JSON response)
============================ */

router.post(
  "/products/edit/:id",

  adminAuthMiddleware,

  upload.fields([
    {
      name: "thumbnail",

      maxCount: 1,
    },

    {
      name: "variantImages",

      maxCount: 10,
    },
  ]),

  updateProduct,
);

/* ============================
   DELETE PRODUCT (SOFT)
============================ */

router.patch(
  "/delete-product/:id",

  adminAuthMiddleware,

  deleteProduct,
);
/* ============================
   RESTORE PRODUCT
============================ */

router.patch(
  "/restore-product/:id",

  adminAuthMiddleware,

  restoreProduct,
);

/* ============================
   PERMANENT DELETE PRODUCT
============================ */

router.delete(
  "/permanent-delete-product/:id",

  adminAuthMiddleware,

  permanentDeleteProduct,
);

/* ============================
   ADD VARIANT
============================ */

router.post(
  "/products/:productId/variants/add",

  adminAuthMiddleware,

  upload.fields([
    {
      name: "variantImages",

      maxCount: 5,
    },
  ]),

  addVariant,
);

/* ============================
   UPDATE VARIANT
============================ */

router.post(
  "/variants/:variantId/edit",

  adminAuthMiddleware,

  upload.fields([
    {
      name: "variantImages",

      maxCount: 5,
    },
  ]),

  updateVariant,
);

/* ============================
   DELETE VARIANT (SOFT)
============================ */

router.patch(
  "/variants/:variantId/delete",

  adminAuthMiddleware,

  deleteVariant,
);

/* ============================
   RESTORE VARIANT
============================ */

router.patch(
  "/variants/:variantId/restore",

  adminAuthMiddleware,

  restoreVariant,
);

/* ============================
   PERMANENT DELETE VARIANT
============================ */

router.delete(
  "/variants/:variantId/permanent-delete",

  adminAuthMiddleware,

  permanentDeleteVariant,
);

/* ============================
   PRODUCT DETAILS
   Must come after "/products/add" and "/products/:id/json",
   otherwise this would swallow those routes since :id matches
   any string.
============================ */

router.get(
  "/products/:id",

  adminAuthMiddleware,

  loadProductDetails,
);

/* ============================
   ORDER MANAGEMENT
============================ */

router.get("/orders", adminAuthMiddleware, loadOrders);

router.get("/orders/:id", adminAuthMiddleware, viewOrderDetails);

router.patch("/orders/:id/status", adminAuthMiddleware, updateOrderStatus);

router.patch(
  "/orders/:id/item/:itemId/status",
  adminAuthMiddleware,
  updateItemStatus,
);

router.patch("/orders/:id/return", adminAuthMiddleware, handleReturnRequest);

router.patch(
  "/orders/:id/item/:itemId/return",
  adminAuthMiddleware,
  handleItemReturnRequest,
);

/* ============================
   INVENTORY MANAGEMENT
============================ */

router.get(
  "/inventory",

  adminAuthMiddleware,

  loadInventory,
);

router.patch(
  "/inventory/update-stock/:variantId",
  adminAuthMiddleware,
  updateVariantStock,
);

export default router;
