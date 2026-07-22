import Product from "../../models/Product.js";

import Variant from "../../models/Variant.js";

import Category from "../../models/Category.js";

import Wishlist from "../../models/Wishlist.js";

import Cart from "../../models/Cart.js";

import Review from "../../models/Review.js";
import Offer from "../../models/Offer.js";
import {
  calculateItemOffer,
  computeFinalOfferData,
} from "../shared/offerService.js";

/* =========================================
   LOAD ALL PRODUCTS
========================================= */

export const loadAllProductsService = async (
  query,

  userId,
) => {
  /* PAGINATION */

  const currentPage = Number(query.page) || 1;

  const limit = 10;

  const skip = (currentPage - 1) * limit;

  /* QUERY PARAMS */

  const search = query.search || "";

  const category = query.category || "";

  const sort = query.sort || "latest";

  const price = query.price || "";

  /* PRODUCT FILTER */

  let filter = {
    isDeleted: false,

    isActive: true,
  };

  /* SEARCH */

  if (search) {
    filter.name = {
      $regex: search,

      $options: "i",
    };
  }

  /* CATEGORY */
  let selectedCategories = [];
  if (category) {
    if (Array.isArray(category)) {
      selectedCategories = category;
      filter.categoryId = { $in: category };
    } else {
      selectedCategories = [category];
      filter.categoryId = category;
    }
  }

  /* FETCH PRODUCTS */

  let products = await Product.find(filter)

    .populate("categoryId")

    .sort({
      createdAt: -1,
    })

    .lean();

  products = products.filter(
    (p) => p.categoryId && !p.categoryId.isDeleted && p.categoryId.isActive,
  );

  /* =========================================
   BULK FETCH VARIANTS & OFFERS (Solves N+1 Query Problem)
========================================= */

  const productIds = products.map((p) => p._id);
  const categoryIds = products
    .map((p) => p.categoryId?._id || p.categoryId)
    .filter(Boolean);
  const now = new Date();

  const [allVariants, allProductOffers, allCategoryOffers] = await Promise.all([
    Variant.find({
      productId: { $in: productIds },
      isDeleted: false,
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .lean(),

    Offer.find({
      applyTo: "PRODUCT",
      targetId: { $in: productIds },
      isActive: true,
      isDeleted: false,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean(),

    Offer.find({
      applyTo: "CATEGORY",
      targetId: { $in: categoryIds },
      isActive: true,
      isDeleted: false,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).lean(),
  ]);

  let flattenedProducts = [];

  for (const product of products) {
    const productVariants = allVariants.filter(
      (v) => v.productId.toString() === product._id.toString(),
    );

    if (!productVariants.length) {
      continue;
    }

    const productOffer = allProductOffers.find(
      (o) => o.targetId.toString() === product._id.toString(),
    );

    const catIdStr = product.categoryId?._id
      ? product.categoryId._id.toString()
      : product.categoryId
        ? product.categoryId.toString()
        : null;
    const categoryOffer = catIdStr
      ? allCategoryOffers.find((o) => o.targetId.toString() === catIdStr)
      : null;

    for (const variant of productVariants) {
      const offerData = computeFinalOfferData(
        variant,
        productOffer,
        categoryOffer,
      );

      flattenedProducts.push({
        ...product,
        variant,
        offerData,
      });
    }
  }

  products = flattenedProducts;

  /* PRICE FILTER */

  if (price) {
    products = products.filter((product) => {
      const variantPrice = product.variant.price;

      if (price === "0-50000") {
        return variantPrice < 50000;
      }

      if (price === "50000-100000") {
        return variantPrice >= 50000 && variantPrice <= 100000;
      }

      if (price === "100000-150000") {
        return variantPrice >= 100000 && variantPrice <= 150000;
      }

      if (price === "150000+") {
        return variantPrice > 150000;
      }

      return true;
    });
  }

  /* SORTING */

  if (sort === "priceLow") {
    products.sort((a, b) => a.variant.price - b.variant.price);
  }

  if (sort === "priceHigh") {
    products.sort((a, b) => b.variant.price - a.variant.price);
  }

  if (sort === "a-z") {
    products.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sort === "z-a") {
    products.sort((a, b) => b.name.localeCompare(a.name));
  }

  /* TOTAL PRODUCTS */

  const totalProducts = products.length;

  const totalPages = Math.ceil(totalProducts / limit);

  /* FINAL PAGINATION */

  products = products.slice(
    skip,

    skip + limit,
  );

  /* CATEGORIES */

  const categories = await Category.find({
    isDeleted: false,

    isActive: true,
  });

  /* WISHLIST ITEMS */

  let wishlistVariantIds = [];

  if (userId) {
    const wishlist = await Wishlist.findOne({
      userId,
    });

    if (wishlist) {
      wishlistVariantIds = wishlist.items.map((item) =>
        item.variantId.toString(),
      );
    }
  }

  let cartVariantIds = [];

  if (userId) {
    const cart = await Cart.findOne({
      userId,
    });

    if (cart) {
      cartVariantIds = cart.items.map((item) => item.variantId.toString());
    }
  }
  /* RETURN */

  return {
    products,

    categories,

    currentPage,

    totalPages,

    totalProducts,

    limit,

    search,

    category,

    selectedCategories,

    sort,

    price,

    wishlistVariantIds,

    cartVariantIds,
  };
};

/* =========================================
   LIVE SEARCH
========================================= */

export const liveSearchService = async (searchQuery) => {
  let products = await Product.find({
    name: { $regex: searchQuery, $options: "i" },
    isDeleted: false,
    isActive: true,
  })
    .populate("defaultVariant")
    .populate("categoryId")
    .limit(10)
    .lean();

  products = products.filter(
    (p) => p.categoryId && !p.categoryId.isDeleted && p.categoryId.isActive,
  ).slice(0, 5);

  // Format the products to include only necessary data for the dropdown
  return products.map(product => {
    let price = 0;
    if (product.defaultVariant && product.defaultVariant.salePrice) {
      price = product.defaultVariant.salePrice;
    }
    
    // We should also check for offers if they apply, but for a fast live search
    // we can just return the base sale price, or we can compute it if it's fast enough.
    // To keep it simple and blazing fast, we just return the salePrice of defaultVariant
    
    return {
      _id: product._id,
      productName: product.name,
      thumbnail: product.thumbnail,
      salePrice: price
    };
  });
};

/* =========================================
   LOAD PRODUCT DETAILS
========================================= */

export const loadProductDetailsService = async (
  productId,

  userId,

  variantId,
) => {
  /* PRODUCT */

  const product = await Product.findOne({
    _id: productId,

    isDeleted: false,
  })

    .populate("categoryId")

    .lean();

  /* PRODUCT NOT FOUND */

  if (!product) {
    return {
      product: null,
    };
  }
  /* =========================================
   PRODUCT AVAILABILITY
========================================= */

  product.isUnavailable =
    !product.isActive ||
    product.categoryId?.isDeleted ||
    !product.categoryId?.isActive;

  /* =========================================
   ALL ACTIVE VARIANTS
========================================= */

  const variants = await Variant.find({
    productId: product._id,

    isDeleted: false,

    isActive: true,
  })

    .sort({
      isDefault: -1,

      createdAt: 1,
    })

    .lean();

  /* NO VARIANTS */

  if (!variants.length) {
    return {
      product: null,
    };
  }

  /* DEFAULT VARIANT */

  const defaultVariant =
    variants.find((variant) => variant._id.toString() === variantId) ||
    variants.find((variant) => variant.isDefault) ||
    variants[0];

  /* ATTACH */

  product.variant = defaultVariant;
  product.offerData = await calculateItemOffer(product, defaultVariant);

  product.variants = await Promise.all(
    variants.map(async (variant) => {
      const offerData = await calculateItemOffer(product, variant);

      return {
        ...variant,

        offerData,
      };
    }),
  );

  /* =========================================
   REVIEWS
========================================= */

  const reviews = await Review.find({
    productId: product._id,

    isDeleted: false,
  })

    .populate(
      "userId",

      "name",
    )

    .sort({
      createdAt: -1,
    })

    .lean();

  /* AVERAGE RATING */

  const totalReviews = reviews.length;

  const averageRating = totalReviews
    ? (
        reviews.reduce(
          (acc, item) => acc + item.rating,

          0,
        ) / totalReviews
      ).toFixed(1)
    : 0;

  /* ATTACH */

  product.reviews = reviews;

  product.rating = averageRating;

  product.reviewCount = totalReviews;

  /* RELATED PRODUCTS */

  let relatedProducts = await Product.find({
    _id: {
      $ne: product._id,
    },

    categoryId: product.categoryId?._id || product.categoryId,

    isDeleted: false,

    isActive: true,
  })

    .populate("categoryId")

    .limit(4)

    .lean();

  /* ATTACH VARIANTS */

  for (const related of relatedProducts) {
    const relatedVariant = await Variant.findOne({
      productId: related._id,

      isDeleted: false,

      isActive: true,

      stock: { $gt: 0 },
    })

      .lean();

    related.variant = relatedVariant;

    related.offerData = await calculateItemOffer(related, relatedVariant);
  }

  /* REMOVE EMPTY VARIANTS */

  relatedProducts = relatedProducts.filter((item) => item.variant);

  /* WISHLIST ITEMS */

  let wishlistVariantIds = [];

  if (userId) {
    const wishlist = await Wishlist.findOne({
      userId,
    });

    if (wishlist) {
      wishlistVariantIds = wishlist.items.map((item) =>
        item.variantId.toString(),
      );
    }
  }

  let cartVariantIds = [];

  if (userId) {
    const cart = await Cart.findOne({
      userId,
    });

    if (cart) {
      cartVariantIds = cart.items.map((item) => item.variantId.toString());
    }
  }

  return {
    product,

    relatedProducts,

    wishlistVariantIds,

    cartVariantIds,
  };
};
