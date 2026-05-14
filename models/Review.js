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

    rating: {

        type: Number,

        required: true,

        min: 1,

        max: 5

    },

    comment: {

        type: String,

        trim: true

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