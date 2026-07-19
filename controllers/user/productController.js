import {
  loadAllProductsService,
  loadProductDetailsService,
  liveSearchService,
} from "../../services/user/productService.js";

/* =========================================
   LOAD ALL PRODUCTS
========================================= */

export const loadAllProducts = async (req, res) => {
  try {
    const data = await loadAllProductsService(
      req.query,

      req.session.userId,
    );

    res.render(
      "user/all-products",

      {
        ...data,

        page: "products",
      },
    );
  } catch (error) {
    console.log(error);

    res.redirect("/");
  }
};

/* =========================================
   LIVE SEARCH
========================================= */

export const liveSearchProducts = async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query) {
      return res.json({ success: true, products: [] });
    }

    const products = await liveSearchService(query);
    
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error in live search:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/* =========================================
   LOAD PRODUCT DETAILS
========================================= */

export const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;

    const data = await loadProductDetailsService(
      productId,

      req.session.userId,

      req.query.variant,
    );

    if (!data.product) {
      return res.redirect("/products");
    }

    res.render(
      "user/product-details",

      {
        ...data,

        page: "products",
      },
    );
  } catch (error) {
    console.log(error);

    res.redirect("/products");
  }
};
