import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    offerName: {
      type: String,
      required: true,
      trim: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: "applyToModel",
    },

    applyTo: {
      type: String,
      enum: ["PRODUCT", "CATEGORY"],
      required: true,
    },

    applyToModel: {
      type: String,
      enum: ["Product", "Category"],
      required: true,
    },

    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      default: "PERCENTAGE",
    },

    discountValue: {
      type: Number,
      required: true,
      min: 1,
    },

    maxDiscount: {
      type: Number,
      default: 0,
    },

    minPurchase: {
      type: Number,
      default: 0,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
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

const Offer = mongoose.model("Offer", offerSchema);

export default Offer;
