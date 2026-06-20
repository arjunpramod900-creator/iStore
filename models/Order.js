import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },

  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Variant",
    required: true,
  },

  productName: {
    type: String,
    required: true,
  },

  productImage: {
    type: String,
    required: true,
  },

  variantName: {
    type: String,
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
  },

  // selling price per item
  price: {
    type: Number,
    required: true,
  },

  // original MRP
  originalPrice: {
    type: Number,
    default: 0,
  },

  // total after offer discount × quantity
  finalPrice: {
    type: Number,
    default: 0,
  },

  offerDiscount: {
    type: Number,
    default: 0,
  },

    couponDiscount: {
    type: Number,
    default: 0,
  },

  taxAmount: {
    type: Number,
    default: 0,
  },

  itemStatus: {
    type: String,
    enum: [
      "Pending",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
      "Returned",
    ],
    default: "Pending",
  },

  cancelReason: {
    type: String,
    default: null,
  },

  itemReturnStatus: {
    type: String,
    enum: ["None", "Requested", "Approved", "Rejected"],
    default: "None",
  },

  itemReturnReason: {
    type: String,
    default: null,
  },

  returnApprovedAt: {
    type: Date,
    default: null,
  },

  refundAmount: {
    type: Number,
    default: 0,
  },

  isRefundProcessed: {
    type: Boolean,
    default: false,
  },
});

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: String,

    phoneNumber: String,

    addressLine1: String,

    city: String,

    state: String,

    country: String,

    pincode: String,
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    orderId: {
      type: String,
      required: true,
      unique: true,
    },

    items: [orderItemSchema],

    shippingAddress: shippingAddressSchema,

    paymentMethod: {
      type: String,
      enum: ["COD", "RAZORPAY", "WALLET"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },

    paymentId: {
      type: String,
      default: null,
    },

    subtotal: {
      type: Number,
      required: true,
    },

    taxAmount: {
      type: Number,
      default: 0,
    },

    deliveryCharge: {
      type: Number,
      default: 0,
    },

    discountAmount: {
      type: Number,
      default: 0,
    },

    offerDiscount: {
      type: Number,
      default: 0,
    },

    couponDiscount: {
      type: Number,
      default: 0,
    },

    finalAmount: {
      type: Number,
      required: true,
    },

    /* ==================================================
      PRICING SNAPSHOT
      Stores the original order values permanently.
      These values NEVER change after order placement.
    ================================================== */

    pricingSnapshot: {

      originalSubtotal: {
        type: Number,
        required: true,
        default: 0,
      },

      originalOfferDiscount: {
        type: Number,
        default: 0,
      },

      originalCouponDiscount: {
        type: Number,
        default: 0,
      },

      originalTaxAmount: {
        type: Number,
        default: 0,
      },

      originalDeliveryCharge: {
        type: Number,
        default: 0,
      },

      originalFinalAmount: {
        type: Number,
        required: true,
        default: 0,
      },

    },

    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },

    couponCode: {
      type: String,
      default: null,
    },

    orderStatus: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "Shipped",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
        "Returned",
      ],
      default: "Pending",
    },

    cancelReason: {
      type: String,
      default: null,
    },

    returnReason: {
      type: String,
      default: null,
    },

    returnStatus: {
      type: String,
      enum: ["None", "Requested", "Approved", "Rejected"],
      default: "None",
    },

    returnApprovedAt: {
      type: Date,
      default: null,
    },

    deliveredDate: {
      type: Date,
      default: null,
    },

    estimatedDelivery: {
      type: Date,
      default: null,
    },

    walletAmountUsed: {
      type: Number,
      default: 0,
    },

    refundAmount: {
      type: Number,
      default: 0,
    },

    isRefundProcessed: {
      type: Boolean,
      default: false,
    },

    razorpayOrderId: {
      type: String,
      default: null,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    razorpaySignature: {
      type: String,
      default: null,
    },

    // payment timeout (30 mins after order creation/retry)
    paymentExpiresAt: {
      type: Date,
      default: null,
    },

    // prevent stock restoration multiple times
    isStockRestored: {
      type: Boolean,
      default: false,
    },

    retryCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// useful indexes
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ orderStatus: 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;