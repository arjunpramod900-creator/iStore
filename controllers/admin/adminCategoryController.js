import {
  getCategoriesService,
  getCategoryByIdService,
  createCategoryService,
  updateCategoryService,
  deleteCategoryService,
  restoreCategoryService,
  permanentDeleteCategoryService,
} from "../../services/admin/categoryService.js";

/* ============================
   LOAD CATEGORY PAGE
============================ */

export const loadCategories = async (req, res) => {
  try {
    const data = await getCategoriesService(req.query);

    res.render(
      "admin/category-management",

      {
        ...data,

        page: "categories",
      },
    );
  } catch (error) {
    console.log(error);

    res.redirect("/admin/dashboard");
  }
};

/* ============================
   RENDER ADD CATEGORY
============================ */

export const renderAddCategory = (req, res) => {
  res.render(
    "admin/add-category",

    {
      page: "categories",

      error: null,
    },
  );
};

/* ============================
   RENDER EDIT CATEGORY
============================ */

export const renderEditCategory = async (req, res) => {
  try {
    const category = await getCategoryByIdService(req.params.id);

    if (!category || category.isDeleted) {
      return res.redirect("/admin/categories");
    }

    res.render(
      "admin/edit-category",

      {
        category,

        page: "categories",

        error: null,
      },
    );
  } catch (error) {
    console.log(error);

    res.redirect("/admin/categories");
  }
};

/* ============================
   ADD CATEGORY
============================ */

export const addCategory = async (req, res) => {
  try {
    await createCategoryService(req);

    return res.redirect("/admin/categories?success=added");
  } catch (error) {
    let errorMessage = error.message;

    if (error.message.includes("E11000")) {
      errorMessage = "Category already exists";
    }

    return res.redirect(
      `/admin/categories?error=${encodeURIComponent(errorMessage)}`,
    );
  }
};

/* ============================
   UPDATE CATEGORY
============================ */

export const updateCategory = async (req, res) => {
  try {
    await updateCategoryService(req);

    res.redirect("/admin/categories?success=updated");
  } catch (error) {
    let errorMessage = error.message;

    if (error.message.includes("E11000")) {
      errorMessage = "Category already exists";
    }

    return res.redirect(
      `/admin/categories?error=${encodeURIComponent(errorMessage)}`,
    );
  }
};

/* ============================
   DELETE CATEGORY
============================ */

export const deleteCategory = async (req, res) => {
  try {
    await deleteCategoryService(req.params.id);

    res.json({
      success: true,

      message: "Category deleted successfully",
    });
  } catch (error) {
    res.json({
      success: false,

      message: error.message,
    });
  }
};

/* ============================
   RESTORE CATEGORY
============================ */
export const restoreCategory = async (req, res) => {
  try {
    await restoreCategoryService(req.params.id);

    res.json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    res.json({
      success: false,

      message: error.message,
    });
  }
};

/* ============================
   PERMANENT DELETE CATEGORY
============================ */

export const permanentDeleteCategory = async (req, res) => {
  try {
    await permanentDeleteCategoryService(req.params.id);

    res.json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    res.json({
      success: false,

      message: error.message,
    });
  }
};
