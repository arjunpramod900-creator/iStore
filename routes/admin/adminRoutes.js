import express from "express";

import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js";

import upload from "../../middleware/multer.js";

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
  renderAddProduct,
  addProduct,
  renderEditProduct,
  updateProduct,
  deleteProduct,
  restoreProduct,
  permanentDeleteProduct,
  loadProductDetails,
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
} from "../../controllers/admin/adminOrderController.js";

import {
  loadInventory,
  updateVariantStock,
} from "../../controllers/admin/adminInventoryController.js";

const router = express.Router();

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
   RENDER ADD PRODUCT
============================ */

router.get(
  "/products/add",

  adminAuthMiddleware,

  renderAddProduct,
);

/* ============================
   ADD PRODUCT
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
   RENDER EDIT PRODUCT
============================ */

router.get(
  "/products/edit/:id",

  adminAuthMiddleware,

  renderEditProduct,
);

/* ============================
   UPDATE PRODUCT
============================ */

router.post(
  "/products/edit/:id",

  adminAuthMiddleware,

  upload.fields([
    {
      name: "thumbnail",

      maxCount: 1,
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
============================ */

router.get(
  "/products/:id",

  adminAuthMiddleware,

  loadProductDetails,
);


/* ============================
   ORDER MANAGEMENT
============================ */

router.get(
  "/orders",
  adminAuthMiddleware,
  loadOrders
);

router.get(
  "/orders/:id",
  adminAuthMiddleware,
  viewOrderDetails
);

router.patch(
  "/orders/:id/status",
  adminAuthMiddleware,
  updateOrderStatus
);

/* ============================
   INVENTORY MANAGEMENT
============================ */

router.get(
  "/inventory",

  adminAuthMiddleware,

  loadInventory
);

router.patch(
  "/inventory/update-stock/:variantId",
  adminAuthMiddleware,
  updateVariantStock
);

export default router;
