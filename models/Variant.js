import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,

      ref: "Product",

      required: true,
    },

    SKU: {
      type: String,

      required: true,

      unique: true,

      trim: true,
    },

    storage: {
      type: String,

      default: "",
    },

    color: {
      type: String,

      default: "",
    },

    RAM: {
      type: String,

      default: "",
    },

    images: [
      {
        type: String,
      },
    ],

    stock: {
      type: Number,

      required: true,

      default: 0,
    },

    price: {
      type: Number,

      required: true,
    },

    comparePrice: {
      type: Number,

      default: 0,
    },

    discountPercentage: {
      type: Number,

      default: 0,
    },

    isDefault: {
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

const Variant = mongoose.model(
  "Variant",

  variantSchema,
);

export default Variant;
