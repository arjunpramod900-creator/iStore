import { productSchema } from "../../validators/productValidator.js";

import {
  createProductService,
  loadProductsService,
  updateProductService,
  deleteProductService,
  restoreProductService,
  permanentDeleteProductService,
  loadProductDetailsService,
  addVariantService,
  updateVariantService,
  deleteVariantService,
  restoreVariantService,
  permanentDeleteVariantService,
  getCategoriesService,
} from "../../services/admin/productService.js";

/* ============================
   LOAD PRODUCTS PAGE
============================ */

export const loadProducts = async (req, res) => {
  try {
    const data = await loadProductsService(req.query);

    res.render(
      "admin/product-management",

      {
        page: "products",

        ...data,

        req,
      },
    );
  } catch (error) {
    console.log("Load Products Error:", error);

    res.redirect("/admin/dashboard");
  }
};

/* ============================
   ADD PRODUCT  (modal submit, JSON response)
============================ */

export const addProduct = async (req, res) => {
  try {
    /* VALIDATE */

    const productValidation = productSchema.safeParse(req.body);

    if (!productValidation.success) {
      return res.status(400).json({
        success: false,

        message: productValidation.error.errors[0].message,
      });
    }

    /* CREATE PRODUCT */

    await createProductService({
      body: req.body,

      files: req.files,

      validatedData: productValidation.data,
    });

    /* SUCCESS */

    res.json({
      success: true,

      message: "Product added successfully",
    });
  } catch (error) {
    console.log("Add Product Error:", error);

    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/* ============================
   UPDATE PRODUCT  (modal submit, JSON response)
============================ */

export const updateProduct = async (req, res) => {
  try {
    const productValidation = productSchema.safeParse(req.body);

    if (!productValidation.success) {
      return res.status(400).json({
        success: false,

        message: productValidation.error.errors[0].message,
      });
    }

    await updateProductService(
      req.params.id,

      {
        body: req.body,

        files: req.files,

        validatedData: productValidation.data,
      },
    );

    res.json({
      success: true,

      message: "Product updated successfully",
    });
  } catch (error) {
    console.log("Update Product Error:", error);

    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

/* ============================
   DELETE PRODUCT
============================ */

export const deleteProduct = async (req, res) => {
  try {
    await deleteProductService(req.params.id);

    res.json({
      success: true,

      message: "Product deleted successfully",
    });
  } catch (error) {
    console.log("Delete Product Error:", error);

    res.json({
      success: false,
    });
  }
};

/* ============================
   RESTORE PRODUCT
============================ */

export const restoreProduct = async (req, res) => {
  try {
    await restoreProductService(req.params.id);

    res.json({
      success: true,

      message: "Product restored successfully",
    });
  } catch (error) {
    res.json({
      success: false,

      message: error.message,
    });
  }
};

/* ============================
   PERMANENT DELETE PRODUCT
============================ */

export const permanentDeleteProduct = async (req, res) => {
  try {
    await permanentDeleteProductService(req.params.id);

    res.json({
      success: true,

      message: "Product permanently deleted",
    });
  } catch (error) {
    res.json({
      success: false,

      message: error.message,
    });
  }
};

/* ============================
   PRODUCT DETAILS PAGE
============================ */

export const loadProductDetails = async (req, res) => {
  try {
    const data = await loadProductDetailsService(req.params.id);

    res.render(
      "admin/product-details",

      {
        page: "products",

        ...data,
      },
    );
  } catch (error) {
    console.log("Load Product Details Error:", error);

    res.redirect("/admin/products");
  }
};

/* ============================
   GET PRODUCT (JSON) — for Edit modal
============================ */

export const getProductJson = async (req, res) => {
  try {
    const data = await loadProductDetailsService(req.params.id);

    const activeVariant = data.variants.find((v) => !v.isDeleted) || null;

    res.json({
      success: true,

      product: data.product,

      variant: activeVariant,
    });
  } catch (error) {
    console.log("Get Product JSON Error:", error);

    res.status(404).json({
      success: false,

      message: "Product not found",
    });
  }
};

/* ============================
   ADD VARIANT
============================ */

export const addVariant = async (req, res) => {
  try {
    await addVariantService({
      productId: req.params.productId,

      body: req.body,

      files: req.files,
    });

    return res.json({
      success: true,

      message: "Variant added successfully",
    });
  } catch (error) {
    console.log("Add Variant Error:", error);

    return res.json({
      success: false,

      message: error.message,
    });
  }
};

/* ============================
   UPDATE VARIANT
============================ */

export const updateVariant = async (req, res) => {
  try {
    await updateVariantService(
      req.params.variantId,

      {
        body: req.body,

        files: req.files,
      },
    );

    return res.json({
      success: true,

      message: "Variant updated successfully",
    });
  } catch (error) {
    console.log("Update Variant Error:", error);

    return res.json({
      success: false,

      message: error.message,
    });
  }
};

/* ============================
   DELETE VARIANT
============================ */

export const deleteVariant = async (req, res) => {
  try {
    await deleteVariantService(req.params.variantId);

    return res.json({
      success: true,

      message: "Variant deleted successfully",
    });
  } catch (error) {
    console.log("Delete Variant Error:", error);

    return res.json({
      success: false,

      message: "Failed to delete variant",
    });
  }
};

/* ============================
   RESTORE VARIANT
============================ */

export const restoreVariant = async (req, res) => {
  try {
    await restoreVariantService(req.params.variantId);

    res.json({
      success: true,

      message: "Variant restored successfully",
    });
  } catch (error) {
    res.json({
      success: false,

      message: error.message,
    });
  }
};

/* ============================
   PERMANENT DELETE VARIANT
============================ */

export const permanentDeleteVariant = async (req, res) => {
  try {
    await permanentDeleteVariantService(req.params.variantId);

    res.json({
      success: true,

      message: "Variant permanently deleted",
    });
  } catch (error) {
    res.json({
      success: false,

      message: error.message,
    });
  }
};
