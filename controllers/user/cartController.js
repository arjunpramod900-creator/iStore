import {

    addToCartService,

    loadCartService,

    updateCartQuantityService,

    removeCartItemService

} from "../../services/user/cartService.js"



/* =========================================
   LOAD CART
========================================= */

export const loadCart = async (

    req,

    res

) => {

    try{

        const userId =
        req.session.userId

        const cart =
        await loadCartService(userId)

        res.render(

            "user/cart",

            {

                cart,

                page: "cart"

            }

        )

    }

    catch(error){

        console.log(
            "Load Cart Error:",
            error
        )

        res.redirect("/")

    }

}



/* =========================================
   ADD TO CART
========================================= */

export const addToCart = async (

    req,

    res

) => {

    try{

        const userId =
        req.session.userId

        const {

            productId,

            variantId,

            quantity

        } = req.body

        const response =
        await addToCartService({

            userId,

            productId,

            variantId,

            quantity

        })

        return res.status(200).json(response)

    }

    catch(error){

        console.log(
            "Add To Cart Error:",
            error
        )

        return res.status(500).json({

            success: false,

            message:
            "Something went wrong"

        })

    }

}



/* =========================================
   UPDATE QUANTITY
========================================= */

export const updateCartQuantity =
async (req, res) => {

   try{


        const userId =
        req.session.userId

        const {

            variantId,

            type

        } = req.body

        const response =
        await updateCartQuantityService({

            userId,

            variantId,

            type

        })

       return res.status(200).json({

    success: true,

    quantity: response.quantity,

    itemSubtotal: response.itemSubtotal,

    cartSubtotal: response.cartSubtotal,

    totalItems: response.totalItems

})

    }

    catch(error){

        console.log(
            "Update Quantity Error:",
            error
        )

        return res.status(500).json({

            success: false,

            message:
            "Something went wrong"

        })

    }

}



/* =========================================
   REMOVE ITEM
========================================= */

export const removeCartItem =
async (req, res) => {

    try{

        const userId =
        req.session.userId

        const {

            variantId

        } = req.params

        const response =
        await removeCartItemService({

            userId,

            variantId

        })

        return res.status(200).json(response)

    }

    catch(error){

        console.log(
            "Remove Cart Item Error:",
            error
        )

        return res.status(500).json({

            success: false,

            message:
            "Something went wrong"

        })

    }

}