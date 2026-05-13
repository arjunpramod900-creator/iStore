import Cart from "../../models/Cart.js"

import Product from "../../models/Product.js"

import Variant from "../../models/Variant.js"

import Wishlist from "../../models/Wishlist.js"



/* =========================================
   LOAD CART
========================================= */

export const loadCartService =
async (userId) => {

    const cart =
    await Cart.findOne({

        userId

    })

    .populate({

        path: "items.productId"

    })

    .populate({

        path: "items.variantId"

    })

    .lean()



    /* EMPTY CART */

    if(!cart){

        return {

            items: [],

            subtotal: 0,

            totalItems: 0

        }

    }



    /* REMOVE INVALID ITEMS */

    cart.items = cart.items.filter(item => {

        return (

            item.productId &&
            item.variantId &&
            item.productId.isActive &&
            !item.productId.isDeleted &&
            item.variantId.isActive &&
            !item.variantId.isDeleted &&
            item.variantId.stock > 0

        )

    })



    /* UPDATE CLEANED CART */

    await Cart.updateOne(

        { _id: cart._id },

        {

            $set: {

                items: cart.items

            }

        }

    )



    /* CALCULATE TOTALS */

    let subtotal = 0

    let totalItems = 0



    cart.items.forEach(item => {

        subtotal +=
        item.price * item.quantity

        totalItems +=
        item.quantity

    })



    cart.subtotal =
    subtotal

    cart.totalItems =
    totalItems



    return cart

}


/* =========================================
   ADD TO CART
========================================= */

export const addToCartService =
async ({

    userId,

    productId,

    variantId,

    quantity

}) => {

    quantity = Number(quantity) || 1



    /* PRODUCT VALIDATION */

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



    /* VARIANT VALIDATION */

   const variant =
await Variant.findOne({

    _id: variantId,

    productId,

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



    /* STOCK VALIDATION */

    if(variant.stock <= 0){

        return {

            success: false,

            message:
            "Out of stock"

        }

    }



    /* MAX LIMIT */

    if(quantity > 5){

        return {

            success: false,

            message:
            "Maximum quantity is 5"

        }

    }



    /* FIND CART */

    let cart =
    await Cart.findOne({

        userId

    })



    /* CREATE CART */

    if(!cart){

        cart =
        new Cart({

            userId,

            items: []

        })

    }



    /* EXISTING ITEM */

    const existingItem =
    cart.items.find(

        item =>

        item.variantId.toString()
        ===
        variantId.toString()

    )



    /* IF EXISTS */

    if(existingItem){

        const newQuantity =
        existingItem.quantity + quantity



        if(newQuantity > 5){

            return {

                success: false,

                message:
                "Maximum quantity reached"

            }

        }



        if(newQuantity > variant.stock){

            return {

                success: false,

                message:
                "Not enough stock"

            }

        }



        existingItem.quantity =
        newQuantity

    }



    /* NEW ITEM */

    else{

        cart.items.push({

            productId,

            variantId,

            quantity,

            price: variant.price

        })

    }
    /* REMOVE FROM WISHLIST */

        const wishlist =
        await Wishlist.findOne({

            userId

        })

        if(wishlist){

            wishlist.items =
            wishlist.items.filter(

                item =>

                item.variantId.toString()
                !==
                variantId.toString()

            )

            await wishlist.save()

        }


    await cart.save()



    return {

        success: true,

        message:
        "Product added to cart"

    }

}



/* =========================================
   UPDATE QUANTITY
========================================= */

export const updateCartQuantityService =
async ({

    userId,

    variantId,

    type

}) => {

    const cart =
    await Cart.findOne({

        userId

    })



    if(!cart){

        return {

            success: false,

            message:
            "Cart not found"

        }

    }



    const item =
    cart.items.find(

        item =>

        item.variantId.toString()
        ===
        variantId.toString()

    )



    if(!item){

        return {

            success: false,

            message:
            "Cart item missing"

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



    /* INCREMENT */

    if(type === "increment"){

        if(item.quantity >= 5){

            return {

                success: false,

                message:
                "Maximum quantity reached"

            }

        }



        if(item.quantity >= variant.stock){

            return {

                success: false,

                message:
                "Stock limit reached"

            }

        }



        item.quantity += 1

    }



    /* DECREMENT */

    if(type === "decrement"){

        if(item.quantity > 1){

            item.quantity -= 1

        }

    }

    const itemSubtotal =
item.price * item.quantity

const cartSubtotal =
cart.items.reduce(

    (total, cartItem) => {

        return total +
        (cartItem.price * cartItem.quantity)

    },

    0

)

const totalItems =
cart.items.reduce(

    (total, cartItem) => {

        return total +
        cartItem.quantity

    },

    0

)

    await cart.save()


return {

    success: true,

    quantity: item.quantity,

    itemSubtotal,

    cartSubtotal,

    totalItems

}

}



/* =========================================
   REMOVE ITEM
========================================= */

export const removeCartItemService =
async ({

    userId,

    variantId

}) => {

    const cart =
    await Cart.findOne({

        userId

    })



    if(!cart){

        return {

            success: false,

            message:
            "Cart not found"

        }

    }

    const removedItem =

    cart.items.find(

        item =>

        item.variantId.toString()
        ===
        variantId.toString()

    )

   const removedCartItem =
cart.items.find(

    item =>

    item.variantId.toString()
    ===
    variantId.toString()

)

cart.items =
cart.items.filter(

    item =>

    item.variantId.toString()
    !==
    variantId.toString()

)


    await cart.save()



  /* =========================================
   RESTORE ONLY IF MOVED FROM WISHLIST
========================================= */

if(

    removedItem &&
    removedItem.movedFromWishlist

){

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

    if(!alreadyExists){

        wishlist.items.push({

            productId:
            removedItem.productId,

            variantId:
            removedItem.variantId

        })

        await wishlist.save()

    }

}

    return {

    success: true,

    message:
    "Item removed",

    restoredToWishlist:

    removedItem &&
    removedItem.movedFromWishlist

}

}