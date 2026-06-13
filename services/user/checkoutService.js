import Cart from "../../models/Cart.js";
import Address from "../../models/Address.js";
import Order from "../../models/Order.js";
import Coupon from "../../models/Coupon.js";


import {
  calculateCheckoutTotals
}
from "../shared/pricingService.js";

import {
  debitWallet,
} from "../shared/walletService.js";

import {
  createRazorpayOrder,
} from "./razorpayService.js";

import {
  verifyRazorpaySignature,
} from "./razorpayService.js";

import {
  calculateItemOffer
}
from "../shared/offerService.js";


/* =========================================
   LOAD CHECKOUT SERVICE
========================================= */

export const loadCheckoutService =
async (

  userId,

  couponCode = null,

) => {
  /* LOAD CART */

  const cart = await Cart.findOne({
    userId,
  })

    .populate({
      path: "items.productId",
    })

    .populate({
      path: "items.variantId",
    })

    .lean();

  /* EMPTY CART */

  if (!cart || cart.items.length === 0) {
    return {
      success: false,

      message: "Cart is empty",
    };
  }

  /* VALID ITEMS */

  const validItems = cart.items.filter((item) => {
    return (
      item.productId &&
      item.variantId &&
      item.productId.isActive &&
      !item.productId.isDeleted &&
      item.variantId.isActive &&
      !item.variantId.isDeleted &&
      item.variantId.stock > 0
    );
  });
    for (const item of validItems) {

      const offerData =
      await calculateItemOffer(

          item.productId,

          item.variantId,

          item.quantity

      );

      item.originalPrice =
      offerData.originalPrice;

      item.finalPrice =
      offerData.finalPrice;

      item.offerDiscount =
      offerData.offerDiscount;

      item.appliedOffer =
      offerData.appliedOffer;

  }

  /* CALCULATE TOTALS */

 let totalItems = 0;

validItems.forEach(item => {

  totalItems += item.quantity;

});

const totals =
await calculateCheckoutTotals({

  cartItems: validItems,

  userId,

  couponCode,

});

  /* LOAD ADDRESSES */

const addresses =
await Address.find({

    userId

})

.sort({

    isDefault: -1,

    createdAt: -1

})

.lean()

/* LOAD ACTIVE COUPONS */

const availableCoupons =
await Coupon.find({

  isDeleted: false,

  isActive: true,

  startDate: {
    $lte: new Date()
  },

  endDate: {
    $gte: new Date()
  }

})
.sort({
  createdAt: -1
})
.lean();

  return {
    success: true,

    cartItems: validItems,

    addresses,

    availableCoupons,

    subtotal:
      totals.subtotal,

    offerDiscount:
      totals.offerDiscount,

    couponDiscount:
      totals.couponDiscount,

    totalItems,

    taxAmount:
      totals.taxAmount,

    deliveryCharge:
  totals.deliveryCharge,

finalAmount:
  totals.finalAmount,
  };
};


/* =========================================
   PLACE ORDER COD SERVICE
========================================= */

export const placeOrderCODService =
async (
  userId,
  addressId,
  deliveryType = "standard",
  paymentMethod = "COD",
  couponCode = null,
) => {
  /* LOAD CART */

  const cart = await Cart.findOne({
    userId,
  })
    .populate("items.productId")
    .populate("items.variantId");

  if (
    !cart ||
    cart.items.length === 0
  ) {
    return {
      success: false,
      message: "Cart is empty",
    };
  }

  /* ADDRESS */

  const address =
    await Address.findOne({
      _id: addressId,
      userId,
    });

  if (!address) {
    return {
      success: false,
      message: "Address not found",
    };
  }

  /* VALID ITEMS */

/* 
   STRICT STOCK REVALIDATION
 */

for (const item of cart.items) {

  /* PRODUCT CHECK */

  if (
    !item.productId ||
    !item.productId.isActive ||
    item.productId.isDeleted
  ) {

    return {
      success: false,

      message:
        `${item.productId?.name || "Product"} is unavailable`,
    };
  }

  /* VARIANT CHECK */

  if (
    !item.variantId ||
    !item.variantId.isActive ||
    item.variantId.isDeleted
  ) {

    return {
      success: false,

      message:
        `${item.productId.name} variant unavailable`,
    };
  }

  /* STOCK CHECK */

  if (item.variantId.stock <= 0) {

    return {
      success: false,

      message:
        `${item.productId.name} is out of stock`,
    };
  }

  /* QUANTITY CHECK */

  if (
    item.quantity >
    item.variantId.stock
  ) {

    return {
      success: false,

      message:
        `Only ${item.variantId.stock} stock available for ${item.productId.name}`,
    };
  }

}

  /* TOTALS */

const totals =
await calculateCheckoutTotals({

  cartItems: cart.items,

  userId,

  couponCode,

  deliveryType,

});

const deliveryCharge =
totals.deliveryCharge;

const finalAmount =
totals.finalAmount;

  /* ORDER ITEMS */

    const orderItems = [];

    for (const item of cart.items) {

        const offerData =
        await calculateItemOffer(

            item.productId,

            item.variantId,

            item.quantity

        );

        orderItems.push({

            productId:
            item.productId._id,

            variantId:
            item.variantId._id,

            productName:
            item.productId.name,

            productImage:
            item.variantId.images?.[0] ||
            item.productId.thumbnail,

            variantName:
            [
                item.variantId.color,
                item.variantId.storage,
            ]
            .filter(Boolean)
            .join(" • "),

            quantity:
            item.quantity,

            originalPrice:
            item.price,

            finalPrice:
            offerData.finalPrice,

            offerDiscount:
            offerData.offerDiscount,

            price:
            offerData.finalPrice,

        });

    }

  /* GENERATE ORDER ID */

  const orderId =
    "IST" +
    Date.now();

    /* =========================================
      WALLET PAYMENT
    ========================================= */


  /* CREATE ORDER */

  const order =
    await Order.create({
      userId,

      orderId,

      items: orderItems,

      shippingAddress: {
        fullName:
          address.fullName,

        phoneNumber:
          address.phoneNumber,

        addressLine1:
          address.addressLine1,

        city:
          address.city,

        state:
          address.state,

        country:
          address.country,

        pincode:
          address.pincode,
      },

      paymentMethod,
      paymentStatus:
      paymentMethod === "COD"
        ? "Pending"
        : "Paid",

      subtotal:
        totals.subtotal,

      discountAmount:
        totals.offerDiscount +
        totals.couponDiscount,

      offerDiscount:
      totals.offerDiscount,

      couponDiscount:
      totals.couponDiscount,

      couponCode:
      totals.coupon?.code || null,

      couponId:
      totals.coupon?._id || null,

      taxAmount:
        totals.taxAmount,

     deliveryCharge:
  deliveryCharge,

finalAmount:
  finalAmount,

      estimatedDelivery:
        new Date(
          Date.now() +
          5 * 24 * 60 * 60 * 1000,
        ),
    });

  /* UPDATE STOCK */

  for (const item of cart.items) {
    item.variantId.stock -=
      item.quantity;

    await item.variantId.save();
  }

  /* CLEAR CART */

  cart.items = [];

  await cart.save();

  return {
    success: true,
    order,
  };
};

/* =========================================
   PLACE ORDER WALLET
========================================= */

export const placeOrderWalletService =
async (
  userId,
  addressId,
  deliveryType = "standard",
  couponCode = null,
) => {

  const cart =
  await Cart.findOne({
    userId,
  })
  .populate("items.productId")
  .populate("items.variantId");

  if (
    !cart ||
    cart.items.length === 0
  ) {
    return {
      success: false,
      message: "Cart is empty",
    };
  }

  const address =
  await Address.findOne({
    _id: addressId,
    userId,
  });

  if (!address) {
    return {
      success: false,
      message: "Address not found",
    };
  }

  for (const item of cart.items) {

    if (
      !item.variantId ||
      item.variantId.stock <
      item.quantity
    ) {

      return {
        success: false,
        message:
        `${item.productId.name} stock unavailable`,
      };
    }

  }

  const totals =
  await calculateCheckoutTotals({

    cartItems:
    cart.items,

    userId,

    couponCode,

    deliveryType,

  });

  const walletResponse =
  await debitWallet({

    userId,

    amount:
      totals.finalAmount,

    transactionType:
      "OrderPayment",

    description:
      "Wallet payment for order",

  });

  if (
    !walletResponse.success
  ) {

    return {
      success: false,
      message:
      "Insufficient wallet balance",
    };

  }

const orderItems = [];

for (const item of cart.items) {

    const offerData =
    await calculateItemOffer(

        item.productId,

        item.variantId,

        item.quantity

    );

    orderItems.push({

        productId:
        item.productId._id,

        variantId:
        item.variantId._id,

        productName:
        item.productId.name,

        productImage:
        item.variantId.images?.[0] ||
        item.productId.thumbnail,

        variantName:
        [
            item.variantId.color,
            item.variantId.storage,
        ]
        .filter(Boolean)
        .join(" • "),

        quantity:
        item.quantity,

        originalPrice:
        item.price,

        finalPrice:
        offerData.finalPrice,

        offerDiscount:
        offerData.offerDiscount,

        price:
        offerData.finalPrice,

    });

}

  const order =
  await Order.create({

    userId,

    orderId:
      "IST" + Date.now(),

    items:
      orderItems,

    shippingAddress: {

      fullName:
        address.fullName,

      phoneNumber:
        address.phoneNumber,

      addressLine1:
        address.addressLine1,

      city:
        address.city,

      state:
        address.state,

      country:
        address.country,

      pincode:
        address.pincode,

    },

    paymentMethod:
      "WALLET",

    paymentStatus:
      "Paid",

    subtotal:
      totals.subtotal,

    discountAmount:
      totals.offerDiscount +
      totals.couponDiscount,

      offerDiscount:
      totals.offerDiscount,

      couponDiscount:
      totals.couponDiscount,

      couponCode:
      totals.coupon?.code || null,

      couponId:
      totals.coupon?._id || null,

    taxAmount:
      totals.taxAmount,

    deliveryCharge:
      totals.deliveryCharge,

    finalAmount:
      totals.finalAmount,

    estimatedDelivery:
      new Date(
        Date.now() +
        5 * 24 * 60 * 60 * 1000
      ),

  });

  for (const item of cart.items) {

    item.variantId.stock -=
    item.quantity;

    await item.variantId.save();

  }

  cart.items = [];

  await cart.save();

  return {

    success: true,

    order,

  };

};

/* =========================================
  RAZORPAY CHECKOUT
========================================= */
export const createRazorpayCheckoutService =
async (
  userId,
  addressId,
  deliveryType = "standard",
  couponCode = null,
) => {

  const cart =
    await Cart.findOne({
      userId,
    })
    .populate("items.productId")
    .populate("items.variantId");

  if (
    !cart ||
    cart.items.length === 0
  ) {

    return {

      success: false,

      message:
        "Cart is empty",

    };

  }

  const address =
    await Address.findOne({

      _id: addressId,

      userId,

    });

  if (!address) {

    return {

      success: false,

      message:
        "Address not found",

    };

  }

  const totals =
    await calculateCheckoutTotals({

      cartItems:
        cart.items,

      userId,

      couponCode,

      deliveryType,

    });

  const razorpayResponse =
    await createRazorpayOrder({

      amount:
        totals.finalAmount,

    });

  if (
    !razorpayResponse.success
  ) {

    return {

      success: false,

      message:
        "Failed to initiate payment",

    };

  }

    return {

      success: true,

      razorpayOrder:
        razorpayResponse.razorpayOrder,

      amount:
        totals.finalAmount,

      addressId,

      deliveryType,

      couponCode,

    };

};

/* =========================================
   VERIFY RAZORPAY PAYMENT
========================================= */

export const verifyRazorpayPaymentService =
async ({

  userId,

  addressId,

  deliveryType,

  couponCode,

  razorpayOrderId,

  razorpayPaymentId,

  razorpaySignature,

}) => {

  const isValid =
  verifyRazorpaySignature({

    razorpayOrderId,

    razorpayPaymentId,

    razorpaySignature,

  });

  if (!isValid) {

    return {

      success: false,

      message:
      "Payment verification failed",

    };

  }

  const response =
  await placeOrderCODService(

    userId,

    addressId,

    deliveryType,

    "RAZORPAY",

    couponCode,

  );

  if (!response.success) {

    return response;

  }
  response.order.paymentMethod =
  "RAZORPAY";

  response.order.paymentStatus =
  "Paid";

  response.order.razorpayOrderId =
  razorpayOrderId;

  response.order.razorpayPaymentId =
  razorpayPaymentId;

  response.order.razorpaySignature =
  razorpaySignature;

  await response.order.save();

  return {

    success: true,

    order:
    response.order,

  };

};