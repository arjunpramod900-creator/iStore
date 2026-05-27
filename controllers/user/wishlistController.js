import {
  loadWishlistService,
  addToWishlistService,
  removeWishlistItemService,
  moveWishlistToCartService,
} from "../../services/user/wishlistService.js";

/* =========================================
   LOAD WISHLIST
========================================= */

export const loadWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;

    const wishlistItems = await loadWishlistService(userId);

    res.render(
      "user/wishlist",

      {
        page: "wishlist",

        wishlistItems,
      },
    );
  } catch (error) {
    console.log(error);

    res.redirect("/");
  }
};
/* =========================================
   ADD TO WISHLIST
========================================= */

export const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.userId;

    const {
      productId,

      variantId,
    } = req.body;

    const response = await addToWishlistService({
      userId,

      productId,

      variantId,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,

      message: "Something went wrong",
    });
  }
};

/* =========================================
   REMOVE WISHLIST ITEM
========================================= */

export const removeWishlistItem = async (req, res) => {
  try {
    const userId = req.session.userId;

    const { variantId } = req.params;

    const response = await removeWishlistItemService({
      userId,

      variantId,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,

      message: "Something went wrong",
    });
  }
};

/* =========================================
   MOVE WISHLIST ITEM TO CART
========================================= */

export const moveWishlistToCart = async (req, res) => {
  try {
    const userId = req.session.userId;

    const { variantId } = req.params;

    const response = await moveWishlistToCartService({
      userId,

      variantId,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,

      message: "Something went wrong",
    });
  }
};
