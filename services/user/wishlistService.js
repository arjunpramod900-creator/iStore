import Wishlist from "../../models/Wishlist.js"

import Product from "../../models/Product.js"

import Variant from "../../models/Variant.js"

import Cart from "../../models/Cart.js"


/* =========================================
   LOAD WISHLIST
========================================= */

export const loadWishlistService =
async (userId) => {

    const wishlist =
    await Wishlist.findOne({

        userId

    })

    .populate({

        path: "items.productId",

        populate: {

            path: "categoryId"

        }

    })

    .populate({

        path: "items.variantId"

    })

    .lean()



    /* EMPTY WISHLIST */

    if(!wishlist){

        return []

    }



    /* REMOVE INVALID ITEMS */

    wishlist.items =
    wishlist.items.filter(item => {

        return (

            item.productId &&
            item.variantId &&
            item.productId.isActive &&
            !item.productId.isDeleted &&
            item.variantId.isActive &&
            !item.variantId.isDeleted

        )

    })



    /* CLEAN DATABASE */

    await Wishlist.updateOne(

        {

            _id: wishlist._id

        },

        {

            $set: {

                items: wishlist.items

            }

        }

    )



    /* FORMAT DATA */

    const wishlistItems =
    wishlist.items.map(item => {

        return {

            _id:
            item.variantId._id,

            productId:
            item.productId._id,

            name:
            item.productId.name,

            thumbnail:
            item.variantId.images?.[0]
            ||
            item.productId.thumbnail,

            category:
            item.productId.categoryId?.name
            ||
            "Apple Product",

            variant: {

                color:
                item.variantId.color,

                storage:
                item.variantId.storage,

                price:
                item.variantId.price

            },

            stock:
            item.variantId.stock,

            status:
            item.variantId.stock > 0
            ? "IN STOCK"
            : "OUT OF STOCK"

        }

    })



    return wishlistItems

}
/* =========================================
   ADD TO WISHLIST
========================================= */

export const addToWishlistService =
async ({

    userId,

    productId,

    variantId

}) => {

    const product =
    await Product.findOne({

        _id: productId,

        isDeleted: false,

        isActive: true

    })

    if(!product){

        return {

            success: false,

            message:
            "Product unavailable"

        }

    }

    const variant =
    await Variant.findOne({

        _id: variantId,

        isDeleted: false,

        isActive: true

    })

    if(!variant){

        return {

            success: false,

            message:
            "Variant unavailable"

        }

    }

    const cart =
    await Cart.findOne({

        userId

    })

    const alreadyInCart =
    cart?.items?.find(

        item =>

        item.variantId.toString()
        ===
        variantId.toString()

    )

    if(alreadyInCart){

        return {

            success: false,

            message:
            "Already added to cart"

        }

    }

    let wishlist =
    await Wishlist.findOne({

        userId

    })

    if(!wishlist){

        wishlist =
        new Wishlist({

            userId,

            items: []

        })

    }

    const alreadyExists =
    wishlist.items.find(

        item =>

        item.variantId.toString()
        ===
        variantId.toString()

    )

    if(alreadyExists){

        return {

            success: false,

            message:
            "Already in wishlist"

        }

    }

    wishlist.items.push({

        productId,

        variantId

    })

    await wishlist.save()

    return {

        success: true,

        message:
        "Added to wishlist"

    }

}

/* =========================================
   REMOVE WISHLIST ITEM
========================================= */

export const removeWishlistItemService =
async ({

    userId,

    variantId

}) => {

    const wishlist =
    await Wishlist.findOne({

        userId

    })

    if(!wishlist){

        return {

            success: false,

            message:
            "Wishlist not found"

        }

    }

    wishlist.items =
    wishlist.items.filter(

        item =>

        item.variantId.toString()
        !==
        variantId.toString()

    )

    await wishlist.save()

    return {

        success: true

    }

}

/* =========================================
   MOVE WISHLIST ITEM TO CART
========================================= */

export const moveWishlistToCartService =
async ({

    userId,

    variantId

}) => {

    const wishlist =
    await Wishlist.findOne({

        userId

    })

    if(!wishlist){

        return {

            success: false,

            message:
            "Wishlist not found"

        }

    }

    const wishlistItem =
    wishlist.items.find(

        item =>

        item.variantId.toString()
        ===
        variantId.toString()

    )

    if(!wishlistItem){

        return {

            success: false,

            message:
            "Wishlist item missing"

        }

    }

    const variant =
    await Variant.findById(

        variantId

    )

    if(!variant){

        return {

            success: false,

            message:
            "Variant unavailable"

        }

    }

    if(variant.stock <= 0){

        return {

            success: false,

            message:
            "Out of stock"

        }

    }

    /* IMPORT CART MODEL */

    const Cart =
    (await import("../../models/Cart.js"))
    .default

    let cart =
    await Cart.findOne({

        userId

    })

    if(!cart){

        cart =
        new Cart({

            userId,

            items: []

        })

    }

    const existingCartItem =
    cart.items.find(

        item =>

        item.variantId.toString()
        ===
        variantId.toString()

    )

    if(existingCartItem){

        if(existingCartItem.quantity >= 5){

            return {

                success: false,

                message:
                "Maximum quantity reached"

            }

        }

        existingCartItem.quantity += 1

    }

    else{

        cart.items.push({

        productId:
        wishlistItem.productId,

        variantId,

        quantity: 1,

        price:
        variant.price,

        movedFromWishlist: true

    })
    }

    /* REMOVE FROM WISHLIST */

    wishlist.items =
    wishlist.items.filter(

        item =>

        item.variantId.toString()
        !==
        variantId.toString()

    )

    await cart.save()

    await wishlist.save()

    return {

        success: true,

        message:
        "Moved to cart"

    }

}