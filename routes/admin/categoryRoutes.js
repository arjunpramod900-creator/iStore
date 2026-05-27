import express from "express";

import adminAuthMiddleware from "../../middleware/adminAuthMiddleware.js";

import uploadCategory from "../../middleware/adminUploadCategory.js";

import {
  loadCategories,
  addCategory,
  renderAddCategory,
  renderEditCategory,
  updateCategory,
  deleteCategory,
} from "../../controllers/admin/adminCategoryController.js";

const router = express.Router();

/* =========================
   CATEGORY LIST
========================= */

router.get("/categories", adminAuthMiddleware, loadCategories);

router.get("/add-category", adminAuthMiddleware, renderAddCategory);
/* =========================
   ADD CATEGORY
========================= */

router.post(
  "/add-category",
  adminAuthMiddleware,
  uploadCategory.single("image"),
  addCategory,
);

/* =========================
   EDIT CATEGORY PAGE
========================= */

router.get("/edit-category/:id", adminAuthMiddleware, renderEditCategory);
/* =========================
   UPDATE CATEGORY
========================= */

router.post(
  "/edit-category/:id",
  adminAuthMiddleware,
  uploadCategory.single("image"),
  updateCategory,
);

/* =========================
   DELETE CATEGORY (SOFT)
========================= */

router.patch("/delete-category/:id", adminAuthMiddleware, deleteCategory);

export default router;
