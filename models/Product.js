import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,

      required: true,

      trim: true,
    },

    slug: {
      type: String,

      required: true,

      unique: true,

      trim: true,
    },

    description: {
      type: String,

      required: true,

      trim: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Category",

      required: true,
    },

    thumbnail: {
      type: String,

      default: "",
    },

    isFeatured: {
      type: Boolean,

      default: false,
    },

    isBestSeller: {
      type: Boolean,

      default: false,
    },

    isDeal: {
      type: Boolean,

      default: false,
    },

    isActive: {
      type: Boolean,

      default: true,
    },

    isDeleted: {
      type: Boolean,

      default: false,
    },
  },

  {
    timestamps: true,
  },
);

const Product = mongoose.model(
  "Product",

  productSchema,
);

export default Product;
