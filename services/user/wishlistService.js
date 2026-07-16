import Wishlist from "../../models/Wishlist.js";

import Product from "../../models/Product.js";

import Variant from "../../models/Variant.js";

import Cart from "../../models/Cart.js";

const getCounts = async (userId) => {
  const [cart, wishlist] = await Promise.all([
    Cart.findOne({ userId }).lean(),

    Wishlist.findOne({ userId }).lean(),
  ]);

  return {
    cartCount: cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,

    wishlistCount: wishlist?.items?.length || 0,
  };
};

/* =========================================
   LOAD WISHLIST
========================================= */

export const loadWishlistService = async (userId) => {
  const wishlist = await Wishlist.findOne({
    userId,
  })

    .populate({
      path: "items.productId",

      populate: {
        path: "categoryId",
      },
    })

    .populate({
      path: "items.variantId",
    })

    .lean();

  /* EMPTY WISHLIST */

  if (!wishlist) {
    return [];
  }

  /* REMOVE INVALID ITEMS */

  wishlist.items = wishlist.items.filter((item) => {
    return (
      item.productId &&
      item.variantId &&
      item.productId.isActive &&
      !item.productId.isDeleted &&
      item.productId.categoryId &&
      item.productId.categoryId.isActive &&
      !item.productId.categoryId.isDeleted &&
      item.variantId.isActive &&
      !item.variantId.isDeleted
    );
  });

  /* CLEAN DATABASE */

  await Wishlist.updateOne(
    {
      _id: wishlist._id,
    },

    {
      $set: {
        items: wishlist.items,
      },
    },
  );

  /* FORMAT DATA */

  const wishlistItems = wishlist.items.map((item) => {
    return {
      _id: item.variantId._id,

      productId: item.productId._id,

      name: item.productId.name,

      thumbnail: item.variantId.images?.[0] || item.productId.thumbnail,

      category: item.productId.categoryId?.name || "Apple Product",

      variant: {
        RAM: item.variantId.RAM,

        color: item.variantId.color,

        storage: item.variantId.storage,

        price: item.variantId.price,
      },

      stock: item.variantId.stock,

      status: item.variantId.stock > 0 ? "IN STOCK" : "OUT OF STOCK",
    };
  });

  return wishlistItems;
};
/* =========================================
   ADD TO WISHLIST
========================================= */

export const addToWishlistService = async ({
  userId,

  productId,

  variantId,
}) => {
  const product = await Product.findById(productId).populate("categoryId");

  if (
    !product ||
    product.isDeleted ||
    !product.isActive ||
    !product.categoryId ||
    product.categoryId.isDeleted ||
    !product.categoryId.isActive
  ) {
    return {
      success: false,

      unavailable: true,

      message: "This item is no longer available",
    };
  }

  const variant = await Variant.findById(variantId);

  if (!variant || variant.isDeleted || !variant.isActive) {
    return {
      success: false,

      unavailable: true,

      message: "This item is no longer available",
    };
  }

  const cart = await Cart.findOne({
    userId,
  });

  const alreadyInCart = cart?.items?.find(
    (item) => item.variantId.toString() === variantId.toString(),
  );

  if (alreadyInCart) {
    return {
      success: false,

      message: "Already added to cart",
    };
  }

  let wishlist = await Wishlist.findOne({
    userId,
  });

  if (!wishlist) {
    wishlist = new Wishlist({
      userId,

      items: [],
    });
  }

  const alreadyExists = wishlist.items.find(
    (item) => item.variantId.toString() === variantId.toString(),
  );

  if (alreadyExists) {
    return {
      success: false,

      message: "Already in wishlist",
    };
  }

  wishlist.items.push({
    productId,

    variantId,
  });

  await wishlist.save();

  const counts = await getCounts(userId);

  return {
    success: true,
    message: "Added to wishlist",
    ...counts,
  };
};

/* =========================================
   REMOVE WISHLIST ITEM
========================================= */

export const removeWishlistItemService = async ({
  userId,

  variantId,
}) => {
  const wishlist = await Wishlist.findOne({
    userId,
  });

  if (!wishlist) {
    return {
      success: false,

      message: "Wishlist not found",
    };
  }

  wishlist.items = wishlist.items.filter(
    (item) => item.variantId.toString() !== variantId.toString(),
  );

  await wishlist.save();

  const counts = await getCounts(userId);

  return {
    success: true,
    ...counts,
  };
};

/* =========================================
   MOVE WISHLIST ITEM TO CART
========================================= */

export const moveWishlistToCartService = async ({
  userId,

  variantId,
}) => {
  const wishlist = await Wishlist.findOne({
    userId,
  });

  if (!wishlist) {
    return {
      success: false,

      message: "Wishlist not found",
    };
  }

  const wishlistItem = wishlist.items.find(
    (item) => item.variantId.toString() === variantId.toString(),
  );

  if (!wishlistItem) {
    return {
      success: false,

      message: "Wishlist item missing",
    };
  }

  /* =========================================
   REVALIDATE PRODUCT + VARIANT
========================================= */

  const variant = await Variant.findOne({
    _id: variantId,
    isDeleted: false,
    isActive: true,
  });

  if (!variant) {
    wishlist.items = wishlist.items.filter(
      (item) => item.variantId.toString() !== variantId.toString(),
    );

    await wishlist.save();

    const counts = await getCounts(userId);

    return {
      success: false,
      unavailable: true,
      message: "This item is no longer available",
      ...counts,
    };
  }

  const product = await Product.findById(wishlistItem.productId).populate(
    "categoryId",
  );

  if (
    !product ||
    product.isDeleted ||
    !product.isActive ||
    !product.categoryId ||
    product.categoryId.isDeleted ||
    !product.categoryId.isActive
  ) {
    wishlist.items = wishlist.items.filter(
      (item) => item.variantId.toString() !== variantId.toString(),
    );

    await wishlist.save();

    const counts = await getCounts(userId);

    return {
      success: false,
      unavailable: true,
      message: "This item is no longer available",
      ...counts,
    };
  }

  if (variant.stock <= 0) {
    const counts = await getCounts(userId);

    return {
      success: false,
      message: "Out of stock",
      ...counts,
    };
  }

  /* IMPORT CART MODEL */

  let cart = await Cart.findOne({
    userId,
  });

  if (!cart) {
    cart = new Cart({
      userId,

      items: [],
    });
  }

  const existingCartItem = cart.items.find(
    (item) => item.variantId.toString() === variantId.toString(),
  );

  if (existingCartItem) {
    if (existingCartItem.quantity >= 5) {
      return {
        success: false,
        message: "Maximum quantity reached",
      };
    }

    if (existingCartItem.quantity >= variant.stock) {
      return {
        success: false,
        message: "Stock limit reached",
      };
    }

    existingCartItem.quantity += 1;
  } else {
    cart.items.push({
      productId: wishlistItem.productId,

      variantId,

      quantity: 1,

      price: variant.price,

      movedFromWishlist: true,
    });
  }

  /* REMOVE FROM WISHLIST */

  wishlist.items = wishlist.items.filter(
    (item) => item.variantId.toString() !== variantId.toString(),
  );

  await cart.save();

  await wishlist.save();

  const counts = await getCounts(userId);

  return {
    success: true,
    message: "Moved to cart",
    ...counts,
  };
};

/* =========================================
   MOVE ALL WISHLIST ITEMS TO CART
========================================= */

export const moveAllWishlistToCartService = async (userId) => {
  const wishlist = await Wishlist.findOne({ userId });

  if (!wishlist || wishlist.items.length === 0) {
    return {
      success: false,
      message: "Wishlist is empty",
    };
  }

  let cart = await Cart.findOne({ userId });

  if (!cart) {
    cart = new Cart({
      userId,
      items: [],
    });
  }

  let addedCount = 0;

  const movedVariantIds = [];

  const skippedItems = [];

  const remainingWishlistItems = [];

  for (const wishlistItem of wishlist.items) {
    const product = await Product.findById(wishlistItem.productId).populate(
      "categoryId",
    );

    const variant = await Variant.findById(wishlistItem.variantId);

    /* =========================================
           PRODUCT CHECK
        ========================================= */

    if (
      !product ||
      product.isDeleted ||
      !product.isActive ||
      !product.categoryId ||
      product.categoryId.isDeleted ||
      !product.categoryId.isActive
    ) {
      skippedItems.push({
        name: product?.name || "Product",
        reason: "Unavailable",
      });

      continue;
    }

    /* =========================================
           VARIANT CHECK
        ========================================= */

    if (!variant || variant.isDeleted || !variant.isActive) {
      skippedItems.push({
        name: product.name,
        reason: "Unavailable",
      });

      continue;
    }

    /* =========================================
           STOCK CHECK
        ========================================= */

    if (variant.stock <= 0) {
      skippedItems.push({
        name: product.name,
        reason: "Out of stock",
      });

      remainingWishlistItems.push(wishlistItem);

      continue;
    }

    /* =========================================
           ALREADY IN CART
        ========================================= */

    const existingCartItem = cart.items.find(
      (item) => item.variantId.toString() === variant._id.toString(),
    );

    if (existingCartItem) {
      skippedItems.push({
        name: product.name,
        reason: "Already in cart",
      });

      remainingWishlistItems.push(wishlistItem);

      continue;
    }

    /* =========================================
           ADD TO CART
        ========================================= */

    cart.items.push({
      productId: product._id,

      variantId: variant._id,

      quantity: 1,

      price: variant.price,

      movedFromWishlist: true,
    });

    movedVariantIds.push(variant._id.toString());

    addedCount++;
  }

  /* =========================================
       KEEP ONLY SKIPPED ITEMS
    ========================================= */

  wishlist.items = remainingWishlistItems;

  await cart.save();

  await wishlist.save();

  const counts = await getCounts(userId);

  return {
    success: true,

    addedCount,

    movedVariantIds,

    skippedCount: skippedItems.length,

    skippedItems,

    message: `${addedCount} item(s) added to cart`,

    ...counts,
  };
};
