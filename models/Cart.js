import mongoose from "mongoose"

const cartItemSchema = new mongoose.Schema({

    productId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Product",

        required: true

    },

    variantId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Variant",

        required: true

    },

    quantity: {

        type: Number,

        required: true,

        default: 1

    },

    price: {

    type: Number,

    required: true

    },

    movedFromWishlist: {

        type: Boolean,

        default: false

    }

}, {

    _id: false

})



const cartSchema = new mongoose.Schema({

    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true,

        unique: true

    },

    items: [

        cartItemSchema

    ]

}, {

    timestamps: true

})



const Cart = mongoose.model(

    "Cart",

    cartSchema

)

export default Cart