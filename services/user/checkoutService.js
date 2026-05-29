import Cart from "../../models/Cart.js";

import Address from "../../models/Address.js";

import Order from "../../models/Order.js";


/* =========================================
   LOAD CHECKOUT SERVICE
========================================= */

export const loadCheckoutService = async (userId) => {
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

  /* CALCULATE TOTALS */

  let subtotal = 0;

  let totalItems = 0;

  validItems.forEach((item) => {
    subtotal += item.price * item.quantity;

    totalItems += item.quantity;
  });

  /* SHIPPING */

  const deliveryCharge = subtotal >= 5000 ? 0 : 99;

  /* TAX */

  const taxAmount = Math.floor(subtotal * 0.02);

  /* FINAL */

  const finalAmount = subtotal + taxAmount + deliveryCharge;

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

  return {
    success: true,

    cartItems: validItems,

    addresses,

    subtotal,

    totalItems,

    taxAmount,

    deliveryCharge,

    finalAmount,
  };
};


/* =========================================
   PLACE ORDER COD SERVICE
========================================= */

export const placeOrderCODService =
async (
  userId,
  addressId,
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

  let subtotal = 0;

  cart.items.forEach(item => {
    subtotal +=
      item.price * item.quantity;
  });

  const deliveryCharge =
    subtotal >= 5000 ? 0 : 99;

  const taxAmount =
    Math.floor(subtotal * 0.02);

  const finalAmount =
    subtotal +
    deliveryCharge +
    taxAmount;

  /* ORDER ITEMS */

  const orderItems =
    cart.items.map(item => ({
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

      price:
        item.price,
    }));

  /* GENERATE ORDER ID */

  const orderId =
    "IST" +
    Date.now();

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

      paymentMethod: "COD",

      subtotal,

      taxAmount,

      deliveryCharge,

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