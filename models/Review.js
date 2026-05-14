import mongoose from "mongoose"

const reviewSchema = new mongoose.Schema({

    userId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "User",

        required: true

    },

    productId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Product",

        required: true

    },

    variantId: {

        type: mongoose.Schema.Types.ObjectId,

        ref: "Variant"

    },

    rating: {

        type: Number,

        required: true,

        min: 1,

        max: 5

    },

    title: {

        type: String,

        trim: true

    },

    comment: {

        type: String,

        trim: true,

        default: ""

    },

    isDeleted: {

        type: Boolean,

        default: false

    }

}, {

    timestamps: true

})

/* =====================================
   PREVENT DUPLICATE REVIEW
===================================== */

reviewSchema.index(

    {

        userId: 1,

        productId: 1

    },

    {

        unique: true

    }

)

export default mongoose.model(

    "Review",

    reviewSchema

)