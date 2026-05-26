import Cart from "../../models/Cart.js"

import Address from "../../models/Address.js"



export const loadCheckoutService =
async (userId) => {

    /* LOAD CART */

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

    if(

        !cart ||

        cart.items.length === 0

    ){

        return {

            success: false,

            message:
            "Cart is empty"

        }

    }




    /* VALID ITEMS */

    const validItems =

    cart.items.filter(item => {

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




    /* CALCULATE TOTALS */

    let subtotal = 0

    let totalItems = 0



    validItems.forEach(item => {

        subtotal +=

        item.price * item.quantity

        totalItems +=

        item.quantity

    })




    /* SHIPPING */

    const deliveryCharge =

    subtotal >= 5000
    ? 0
    : 99




    /* TAX */

    const taxAmount =

    Math.floor(

        subtotal * 0.02

    )




    /* FINAL */

    const finalAmount =

        subtotal +
        taxAmount +
        deliveryCharge




    /* LOAD ADDRESSES */

    const addressDoc =
    await Address.findOne({

        userId

    })

    .lean()




    return {

        success: true,

        cartItems: validItems,

        addresses:

        addressDoc?.addresses || [],

        subtotal,

        totalItems,

        taxAmount,

        deliveryCharge,

        finalAmount

    }

}