import express from "express"

const router = express.Router()

import {

    isLoggedIn

}

from "../../middleware/authMiddleware.js"

import {

    addToWishlist,

    removeWishlistItem,

    loadWishlist,

    moveWishlistToCart

}

from "../../controllers/user/wishlistController.js"



/* =========================================
   PROTECTED WISHLIST ROUTES
========================================= */

router.use(

    isLoggedIn

)



/* =========================================
   LOAD WISHLIST PAGE
========================================= */

router.get(

    "/",

    loadWishlist

)



/* =========================================
   ADD TO WISHLIST
========================================= */

router.post(

    "/add",

    addToWishlist

)



/* =========================================
   REMOVE WISHLIST ITEM
========================================= */

router.delete(

    "/remove/:variantId",

    removeWishlistItem

)

/* =========================================
   MOVE WISHLIST ITEM TO CART
========================================= */

router.post(

    "/move-to-cart/:variantId",

    moveWishlistToCart

)



export default router