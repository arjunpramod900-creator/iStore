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

  price: {
    type: Number,

    required: true,
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

    "Returned"

  ],

  default: "Pending",
},
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: String,

  phoneNumber: String,

  addressLine1: String,

  city: String,

  state: String,

  country: String,

  pincode: String,
});

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

    finalAmount: {
      type: Number,

      required: true,
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

      enum: [

        "None",

        "Requested",

        "Approved",

        "Rejected"

      ],

      default: "None",

    },

    deliveredDate: {
      type: Date,

      default: null,
    },

    estimatedDelivery: {
      type: Date,

      default: null,
    },
  },

  {
    timestamps: true,
  },
);

const Order = mongoose.model(
  "Order",

  orderSchema,
);

export default Order;
