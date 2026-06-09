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
    },

    applyTo: {
      type: String,
      enum: [
        "PRODUCT",
        "CATEGORY",
      ],
      required: true,
    },

    discountType: {
      type: String,
      enum: [
        "PERCENTAGE",
        "FIXED",
      ],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
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
  },
  {
    timestamps: true,
  }
);

const Offer = mongoose.model(
  "Offer",
  offerSchema
);

export default Offer;