import Cart from "../../models/Cart.js";

import Product from "../../models/Product.js";

import Variant from "../../models/Variant.js";

import Wishlist from "../../models/Wishlist.js";

import { calculateItemOffer }
from "../shared/offerService.js";


const getCounts = async (userId) => {

    const [cart, wishlist] = await Promise.all([

        Cart.findOne({ userId }).lean(),

        Wishlist.findOne({ userId }).lean()

    ]);

    return {

        cartCount:
            cart?.items?.reduce(
                (sum, item) => sum + item.quantity,
                0
            ) || 0,

        wishlistCount:
            wishlist?.items?.length || 0

    };

};

/* =========================================
   LOAD CART
========================================= */

export const loadCartService = async (userId) => {
  const cart = await Cart.findOne({
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

  /* CATEGORY INVALID */

if (
  !item.productId.categoryId ||
  !item.productId.categoryId.isActive ||
  item.productId.categoryId.isDeleted
) {

  cartUpdated = true;

  stockMessages.push(
    `${item.productId.name} category unavailable`
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

    /* FIX: thread the computed badge label onto the
       item so the EJS never has to echo the raw,
       possibly-capped discountValue itself */

    item.badgeLabel =
    offerData.badgeLabel;

    subtotal +=
    offerData.originalPrice *
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



const product = await Product.findById(productId)
.populate("categoryId");

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

  /* VARIANT VALIDATION */



const variant = await Variant.findOne({
  _id: variantId,
  productId,
});

if (
  !variant ||
  variant.isDeleted ||
  !variant.isActive
) {

  return {
    success: false,

    unavailable: true,

    message: "This item is no longer available",
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
    if (quantity > variant.stock) {
      return {
        success: false,
        message: `Only ${variant.stock} units available`,
      };
    }

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

const counts = await getCounts(userId);

return {
  success: true,
  message: "Product added to cart",
  ...counts
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

const variant = await Variant.findById(
  variantId
);

const product = await Product.findById(
  item.productId
)
.populate("categoryId");

if (
  !product ||
  product.isDeleted ||
  !product.isActive ||
  !product.categoryId ||
  product.categoryId.isDeleted ||
  !product.categoryId.isActive ||
  !variant ||
  variant.isDeleted ||
  !variant.isActive
) {

  cart.items = cart.items.filter(
    (cartItem) =>
      cartItem.variantId.toString() !==
      variantId.toString()
  );

  await cart.save();

  return {
    success: false,
    unavailable: true,
    message: "This item is no longer available",
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

let cartSubtotal = 0;
let totalItems = 0;
let itemSubtotal = 0;
let offerDiscount = 0;
let itemBadgeLabel = null;

for (const cartItem of cart.items) {

const product = await Product.findById(
    cartItem.productId
).populate("categoryId");

const variant = await Variant.findById(
    cartItem.variantId
);

if (
    !product ||
    product.isDeleted ||
    !product.isActive ||
    !product.categoryId ||
    product.categoryId.isDeleted ||
    !product.categoryId.isActive ||
    !variant ||
    variant.isDeleted ||
    !variant.isActive
) {
    continue;
}

    const offerData =
    await calculateItemOffer(
        product,
        variant,
        cartItem.quantity
    );

    const lineTotal =
    offerData.finalPrice *
    cartItem.quantity;

    if(
        cartItem.variantId.toString() ===
        variantId.toString()
    ){
        itemSubtotal = lineTotal;

        /* FIX: surface this item's real badge label
           back to the client so the cart page can
           refresh the badge text after a quantity
           change without a full page reload */

        itemBadgeLabel = offerData.badgeLabel;
    }

    cartSubtotal +=
    offerData.originalPrice *
    cartItem.quantity;

    offerDiscount +=
    offerData.offerDiscount;

    totalItems +=
    cartItem.quantity;
}

  const discountedSubtotal = cartSubtotal - offerDiscount;

  const shipping = discountedSubtotal >= 5000 ? 0 : 99;

  const estimatedTax = Math.floor(discountedSubtotal * 0.02);

  const finalTotal = discountedSubtotal + shipping + estimatedTax;

  await cart.save();

  const counts = await getCounts(userId);

return {
    success: true,

    quantity: item.quantity,

    itemSubtotal,

    itemBadgeLabel,

    cartSubtotal,

    offerDiscount,

    totalItems,

    shipping,

    estimatedTax,

    finalTotal,

    ...counts
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
    item =>
      item.variantId.toString() ===
      variantId.toString()
  );

  cart.items = cart.items.filter(
    item =>
      item.variantId.toString() !==
      variantId.toString()
  );

  await cart.save();

  /* =========================================
     RESTORE TO WISHLIST IF MOVED FROM THERE
  ========================================= */

  if (
    removedItem &&
    removedItem.movedFromWishlist
  ) {

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
      item =>
        item.variantId.toString() ===
        variantId.toString()
    );

    const product = await Product.findById(
      removedItem.productId
    ).populate("categoryId");

    const variant = await Variant.findById(
      removedItem.variantId
    );

    const canRestore =
      product &&
      product.isActive &&
      !product.isDeleted &&
      product.categoryId &&
      product.categoryId.isActive &&
      !product.categoryId.isDeleted &&
      variant &&
      variant.isActive &&
      !variant.isDeleted;

    if (
      !alreadyExists &&
      canRestore
    ) {

      wishlist.items.push({
        productId: removedItem.productId,
        variantId: removedItem.variantId,
      });

      await wishlist.save();
    }
  }

  /* =========================================
     RECALCULATE CART TOTALS
  ========================================= */

  let cartSubtotal = 0;
  let offerDiscount = 0;
  let totalItems = 0;

  for (const item of cart.items) {

    const product = await Product.findById(
      item.productId
    ).populate("categoryId");

    const variant = await Variant.findById(
      item.variantId
    );

    if (
      !product ||
      product.isDeleted ||
      !product.isActive ||
      !product.categoryId ||
      product.categoryId.isDeleted ||
      !product.categoryId.isActive ||
      !variant ||
      variant.isDeleted ||
      !variant.isActive
    ) {
      continue;
    }

    const offerData =
      await calculateItemOffer(
        product,
        variant,
        item.quantity
      );

    cartSubtotal +=
      offerData.originalPrice *
      item.quantity;

    offerDiscount +=
      offerData.offerDiscount;

    totalItems +=
      item.quantity;
  }

  const discountedSubtotal = cartSubtotal - offerDiscount;

  const shipping = discountedSubtotal >= 5000 ? 0 : 99;

  const estimatedTax = Math.floor(discountedSubtotal * 0.02);

  const finalTotal = discountedSubtotal + shipping + estimatedTax;

  const counts =
    await getCounts(userId);

  return {
    success: true,

    message: "Item removed",

    restoredToWishlist:
      removedItem &&
      removedItem.movedFromWishlist,

    cartSubtotal,

    offerDiscount,

    totalItems,

    shipping,

    estimatedTax,

    finalTotal,

    ...counts,
  };
};



/* =========================================
   CLEAR CART
========================================= */

export const clearCartService = async (userId) => {

    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
        return {
            success: false,
            message: "Cart is already empty"
        };
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
        wishlist = new Wishlist({
            userId,
            items: []
        });
    }

    /* Restore wishlist items that originally came
       from the wishlist */

    for (const item of cart.items) {

        if (!item.movedFromWishlist) {
            continue;
        }

        const product = await Product.findById(item.productId)
            .populate("categoryId");

        const variant = await Variant.findById(item.variantId);

        const canRestore =
            product &&
            product.isActive &&
            !product.isDeleted &&
            product.categoryId &&
            product.categoryId.isActive &&
            !product.categoryId.isDeleted &&
            variant &&
            variant.isActive &&
            !variant.isDeleted;

        if (!canRestore) {
            continue;
        }

        const alreadyExists = wishlist.items.find(
            wishlistItem =>
                wishlistItem.variantId.toString() ===
                item.variantId.toString()
        );

        if (!alreadyExists) {

            wishlist.items.push({
                productId: item.productId,
                variantId: item.variantId
            });

        }

    }

    cart.items = [];

    await Promise.all([
        cart.save(),
        wishlist.save()
    ]);

    const counts = await getCounts(userId);

    return {
        success: true,
        message: "Cart cleared",
        ...counts
    };

};



/* =========================================
   CHECK CART VALIDITY (pre-checkout)

========================================= */

export const checkCartValidityService = async (userId) => {

  const cart = await Cart.findOne({
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

  if (!cart || cart.items.length === 0) {
    return {
      success: false,
      message: "Cart is empty",
    };
  }

  const blockedItems = [];

  const validItems = [];

  for (const item of cart.items) {

    const isProductInvalid =
      !item.productId ||
      !item.productId.isActive ||
      item.productId.isDeleted;

      const isCategoryInvalid =
  !item.productId?.categoryId ||
  !item.productId.categoryId.isActive ||
  item.productId.categoryId.isDeleted;

    const isVariantInvalid =
      !item.variantId ||
      !item.variantId.isActive ||
      item.variantId.isDeleted;

    const isOutOfStock =
      !isVariantInvalid && item.variantId.stock <= 0;

    if (isProductInvalid ||isCategoryInvalid || isVariantInvalid || isOutOfStock) {

      blockedItems.push({
        productName: item.productId?.name || "A product",
reason: isOutOfStock
  ? "Out of stock"
  : isCategoryInvalid
  ? "Category unavailable"
  : "No longer available",
      });

    } else {

      validItems.push(item);
    }
  }

  return {
    success: true,
    totalCount: cart.items.length,
    validCount: validItems.length,
    blockedCount: blockedItems.length,
    blockedItems,
  };
};