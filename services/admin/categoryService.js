import Category from "../../models/Category.js";
import Product from "../../models/Product.js";

import { categorySchema } from "../../validators/categoryValidator.js";

import { generateSlug } from "../../utils/generateSlug.js";

import { uploadImage } from "../../utils/uploadToCloudinary.js";

/* ============================
   IMAGE VALIDATION
============================ */

const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/* ============================
   LOAD CATEGORIES
============================ */

export const getCategoriesService = async (queryData) => {
  const page = parseInt(queryData.page) || 1;

  const limit = 5;

  const skip = (page - 1) * limit;

  const search = queryData.search || "";

  const status = queryData.status || "all";

  let query = {};

  /* 
   TRASH FILTER
 */

  if (status === "trash") {
    query.isDeleted = true;
  } else {
    query.isDeleted = false;
  }

  /* SEARCH */

  if (search) {
    query.name = {
      $regex: search,
      $options: "i",
    };
  }

  /* STATUS FILTER*/

  if (status === "active") {
    query.isActive = true;
  }

  if (status === "inactive") {
    query.isActive = false;
  }

  /* FETCH CATEGORIES */

  const categories = await Category.find(query)

    .sort({ createdAt: -1 })

    .skip(skip)

    .limit(limit);

  /* TOTAL */
  const totalCategories = await Category.countDocuments(query);

  const totalPages = Math.ceil(totalCategories / limit);

  /* STATS*/
  const total = await Category.countDocuments({
    isDeleted: false,
  });

  const active = await Category.countDocuments({
    isDeleted: false,
    isActive: true,
  });

  const inactive = await Category.countDocuments({
    isDeleted: false,
    isActive: false,
  });

  const categoriesWithCounts = await Promise.all(
    categories.map(async (cat) => {
      const productCount = await Product.countDocuments({ categoryId: cat._id });
      return {
        ...cat.toObject(),
        productCount,
      };
    }),
  );

  const allActiveCategories = await Category.find({ isDeleted: false })
    .select("name _id")
    .lean();

  return {
    categories: categoriesWithCounts,

    allActiveCategories,

    currentPage: page,

    totalPages,

    totalCategories,

    limit,

    search,

    status,

    stats: {
      total,
      active,
      inactive,
    },
  };
};

/* ============================
   GET CATEGORY BY ID
============================ */

export const getCategoryByIdService = async (categoryId) => {
  return await Category.findById(categoryId);
};

/* ============================
   ADD CATEGORY
============================ */

export const createCategoryService = async (req) => {
  const result = categorySchema.safeParse(req.body);

  if (!result.success) {
    throw new Error(result.error.errors[0].message);
  }

  const { name, description, isActive } = result.data;

  const slug = generateSlug(name);

  /* DUPLICATE */

  const existing = await Category.findOne({
    name: {
      $regex: `^${name.trim()}$`,
      $options: "i",
    },

    isDeleted: false,
  });

  if (existing) {
    throw new Error("Category already exists");
  }

  /* IMAGE */

  let imageUrl = "";

  if (req.file) {
    const maxSize = 5 * 1024 * 1024;

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      throw new Error("Only JPG, PNG and WEBP images are allowed");
    }

    if (req.file.size > maxSize) {
      throw new Error("Image size must be below 5MB");
    }

    imageUrl = await uploadImage(req.file.buffer);
  }

  const category = new Category({
    name,

    slug,

    description,

    image: imageUrl,

    isActive: isActive === true || isActive === "true",
  });

  await category.save();
};

/* ============================
   UPDATE CATEGORY
============================ */

export const updateCategoryService = async (req) => {
  const categoryId = req.params.id;

  const category = await Category.findById(categoryId);

  if (!category || category.isDeleted) {
    throw new Error("Category not found");
  }

  const result = categorySchema.safeParse(req.body);

  if (!result.success) {
    throw new Error(result.error.errors[0].message);
  }

  const { name, description, isActive } = result.data;

  let slug = generateSlug(name);

  /* CHECK SLUG */

  const existingSlug = await Category.findOne({
    slug,

    _id: {
      $ne: categoryId,
    },
  });

  if (existingSlug) {
    slug = `${slug}-${Date.now()}`;
  }

  /* DUPLICATE */

  const existing = await Category.findOne({
    name: {
      $regex: `^${name.trim()}$`,
      $options: "i",
    },

    _id: {
      $ne: categoryId,
    },

    isDeleted: false,
  });

  if (existing) {
    throw new Error("Category already exists");
  }

  const updateData = {
    name,

    slug,

    description,

    isActive: isActive === true || isActive === "true",
  };

  /* IMAGE */

  if (req.file) {
    const maxSize = 5 * 1024 * 1024;

    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      throw new Error("Only JPG, PNG and WEBP images are allowed");
    }

    if (req.file.size > maxSize) {
      throw new Error("Image size must be below 5MB");
    }

    updateData.image = await uploadImage(req.file.buffer);
  }

  await Category.findByIdAndUpdate(
    categoryId,

    updateData,
  );
};

/* ============================
   DELETE CATEGORY
============================ */

export const deleteCategoryService = async (categoryId) => {
  const category = await Category.findById(categoryId);

  if (!category || category.isDeleted) {
    throw new Error("Category not found");
  }

  await Category.findByIdAndUpdate(
    categoryId,

    {
      isDeleted: true,
    },
  );
};

/* ============================
   RESTORE CATEGORY
============================ */

export const restoreCategoryService = async (categoryId) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found");
  }

  await Category.findByIdAndUpdate(
    categoryId,

    {
      isDeleted: false,
    },
  );
};

/* ============================
   PERMANENT DELETE CATEGORY
============================ */

export const permanentDeleteCategoryService = async (
  categoryId,
  action,
  targetCategoryId,
) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found");
  }

  const productCount = await Product.countDocuments({ categoryId });

  if (productCount > 0) {
    if (action === "reassign") {
      if (!targetCategoryId) {
        throw new Error("Please select a target category to reassign products.");
      }
      if (targetCategoryId.toString() === categoryId.toString()) {
        throw new Error("Target category cannot be the category being deleted.");
      }
      const targetCat = await Category.findById(targetCategoryId);
      if (!targetCat || targetCat.isDeleted) {
        throw new Error("Target category is invalid or deleted.");
      }
      await Product.updateMany({ categoryId }, { categoryId: targetCategoryId });
    } else if (action === "trash") {
      await Product.updateMany({ categoryId }, { isDeleted: true });
    } else {
      throw new Error(
        `Cannot permanently delete category. ${productCount} product(s) still belong to this category. Please select an action to reassign or trash them.`,
      );
    }
  }

  await Category.findByIdAndDelete(categoryId);
};
