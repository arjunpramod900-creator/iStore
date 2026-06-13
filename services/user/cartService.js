import Cart from "../../models/Cart.js";

import Product from "../../models/Product.js";

import Variant from "../../models/Variant.js";

import Wishlist from "../../models/Wishlist.js";

import { calculateItemOffer }
from "../shared/offerService.js";

/* =========================================
   LOAD CART
========================================= */

export const loadCartService = async (userId) => {
  const cart = await Cart.findOne({
    userId,
  })

    .populate({
      path: "items.productId",
    })

    .populate({
      path: "items.variantId",
    })

    .lean();

  /* EMPTY CART */

  if (!cart) {
    return {
      items: [],

      subtotal: 0,

      totalItems: 0,
    };
  }
  /* CART STOCK SYNC */

    let cartUpdated = false;

    const stockMessages = [];

  /* REMOVE INVALID ITEMS */

  /*  CLEAN + AUTO SYNC CART*/

cart.items = cart.items.filter((item) => {

  /* PRODUCT INVALID */

  if (
    !item.productId ||
    !item.productId.isActive ||
    item.productId.isDeleted
  ) {

    cartUpdated = true;

    stockMessages.push(
      "A product was removed from cart"
    );

    return false;
  }

  /* VARIANT INVALID */

  if (
    !item.variantId ||
    !item.variantId.isActive ||
    item.variantId.isDeleted
  ) {

    cartUpdated = true;

    stockMessages.push(
      `${item.productId.name} variant removed`
    );

    return false;
  }

  /* OUT OF STOCK */

  if (item.variantId.stock <= 0) {

    cartUpdated = true;

    stockMessages.push(
      `${item.productId.name} is out of stock`
    );

    return false;
  }

  /* AUTO REDUCE QUANTITY */

  if (
    item.quantity >
    item.variantId.stock
  ) {

    item.quantity =
      item.variantId.stock;

    cartUpdated = true;

    stockMessages.push(
      `${item.productId.name} quantity adjusted to available stock`
    );
  }

  return true;

});

  /* UPDATE CLEANED CART */

if (cartUpdated) {

  await Cart.updateOne(
    { _id: cart._id },

    {
      $set: {
        items: cart.items,
      },
    },
  );

}

  /* CALCULATE TOTALS */

let subtotal = 0;

let totalItems = 0;

let offerDiscount = 0;

for (const item of cart.items) {

    const offerData =
    await calculateItemOffer(

        item.productId,

        item.variantId,

        item.quantity

    );

    item.originalPrice =
    offerData.originalPrice;

    item.finalPrice =
    offerData.finalPrice;

    item.offerDiscount =
    offerData.offerDiscount;

    item.appliedOffer =
    offerData.appliedOffer;

    item.offerType =
    offerData.offerType;

    subtotal +=
    offerData.finalPrice *
    item.quantity;

    offerDiscount +=
    offerData.offerDiscount;

    totalItems +=
    item.quantity;

}

  cart.subtotal = subtotal;

  cart.offerDiscount = offerDiscount;

  cart.totalItems = totalItems;

  cart.stockMessages =
  stockMessages;

return cart;
};

/* =========================================
   ADD TO CART
========================================= */

export const addToCartService = async ({
  userId,

  productId,

  variantId,

  quantity,
}) => {
  quantity = Number(quantity) || 1;

  /* PRODUCT VALIDATION */

  const product = await Product.findOne({
    _id: productId,

    isDeleted: false,

    isActive: true,
  });

  if (!product) {
    return {
      success: false,

      message: "Product unavailable",
    };
  }

  /* VARIANT VALIDATION */

  const variant = await Variant.findOne({
    _id: variantId,

    productId,

    isDeleted: false,

    isActive: true,
  });

  if (!variant) {
    return {
      success: false,

      message: "Variant unavailable",
    };
  }

  /* STOCK VALIDATION */

  if (variant.stock <= 0) {
    return {
      success: false,

      message: "Out of stock",
    };
  }

  /* MAX LIMIT */

  if (quantity > 5) {
    return {
      success: false,

      message: "Maximum quantity is 5",
    };
  }

  /* FIND CART */

  let cart = await Cart.findOne({
    userId,
  });

  /* CREATE CART */

  if (!cart) {
    cart = new Cart({
      userId,

      items: [],
    });
  }

  /* EXISTING ITEM */

  const existingItem = cart.items.find(
    (item) => item.variantId.toString() === variantId.toString(),
  );

  /* IF EXISTS */

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;

    if (newQuantity > 5) {
      return {
        success: false,

        message: "Maximum quantity reached",
      };
    }

    if (newQuantity > variant.stock) {
      return {
        success: false,

        message: "Not enough stock",
      };
    }

    existingItem.quantity = newQuantity;
  } else {

  /* NEW ITEM */
    cart.items.push({
      productId,

      variantId,

      quantity,

      price: variant.price,
    });
  }
  /* REMOVE FROM WISHLIST */

  const wishlist = await Wishlist.findOne({
    userId,
  });

  if (wishlist) {
    wishlist.items = wishlist.items.filter(
      (item) => item.variantId.toString() !== variantId.toString(),
    );

    await wishlist.save();
  }

  await cart.save();

  return {
    success: true,

    message: "Product added to cart",
  };
};

/* =========================================
   UPDATE QUANTITY
========================================= */

export const updateCartQuantityService = async ({
  userId,

  variantId,

  type,
}) => {
  const cart = await Cart.findOne({
    userId,
  });

  if (!cart) {
    return {
      success: false,

      message: "Cart not found",
    };
  }

  const item = cart.items.find(
    (item) => item.variantId.toString() === variantId.toString(),
  );

  if (!item) {
    return {
      success: false,

      message: "Cart item missing",
    };
  }

  const variant = await Variant.findById(variantId);

  if (!variant) {
    return {
      success: false,

      message: "Variant unavailable",
    };
  }

  /* INCREMENT */

  if (type === "increment") {
    if (item.quantity >= 5) {
      return {
        success: false,

        message: "Maximum quantity reached",
      };
    }

    if (item.quantity >= variant.stock) {
      return {
        success: false,

        message: "Stock limit reached",
      };
    }

    item.quantity += 1;
  }

  /* DECREMENT */

  if (type === "decrement") {
    if (item.quantity > 1) {
      item.quantity -= 1;
    }
  }

  const itemSubtotal = item.price * item.quantity;

  const cartSubtotal = cart.items.reduce(
    (total, cartItem) => {
      return total + cartItem.price * cartItem.quantity;
    },

    0,
  );

  const totalItems = cart.items.reduce(
    (total, cartItem) => {
      return total + cartItem.quantity;
    },

    0,
  );

  /* =========================================
   SHIPPING
========================================= */

  const shipping = cartSubtotal >= 5000 ? 0 : 99;

  /* =========================================
   TAX
========================================= */

  const estimatedTax = Math.floor(cartSubtotal * 0.02);

  /* =========================================
   FINAL TOTAL
========================================= */

  const finalTotal = cartSubtotal + shipping + estimatedTax;

  await cart.save();

  return {
    success: true,

    quantity: item.quantity,

    itemSubtotal,

    cartSubtotal,

    totalItems,

    shipping,

    estimatedTax,

    finalTotal,
  };
};

/* =========================================
   REMOVE ITEM
========================================= */

export const removeCartItemService = async ({
  userId,

  variantId,
}) => {
  const cart = await Cart.findOne({
    userId,
  });

  if (!cart) {
    return {
      success: false,

      message: "Cart not found",
    };
  }

  const removedItem = cart.items.find(
    (item) => item.variantId.toString() === variantId.toString(),
  );

  const removedCartItem = cart.items.find(
    (item) => item.variantId.toString() === variantId.toString(),
  );

  cart.items = cart.items.filter(
    (item) => item.variantId.toString() !== variantId.toString(),
  );

  await cart.save();

  /* =========================================
   RESTORE ONLY IF MOVED FROM WISHLIST
========================================= */

  if (removedItem && removedItem.movedFromWishlist) {
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

    if (!alreadyExists) {
      wishlist.items.push({
        productId: removedItem.productId,

        variantId: removedItem.variantId,
      });

      await wishlist.save();
    }
  }

  return {
    success: true,

    message: "Item removed",

    restoredToWishlist: removedItem && removedItem.movedFromWishlist,
  };
};
