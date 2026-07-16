import { validateCoupon } from "../user/couponService.js";
import { calculateItemOffer } from "./offerService.js";

/* =========================================
   CALCULATE CHECKOUT TOTALS

   Definitions (spec-compliant):
   ─────────────────────────────
   originalSubtotal  = sum(variant.price × qty)       ← pre-offer, for pricingSnapshot
   offerDiscount     = sum(offerData.offerDiscount)   ← total line savings
   subtotal          = originalSubtotal − offerDiscount
                     = sum(finalPrice × qty)           ← post-offer, pre-coupon
                     = what Order.subtotal stores
   couponDiscount    = applied on subtotal
   finalAmount       = subtotal − couponDiscount + delivery + tax
========================================= */
export const calculateCheckoutTotals = async ({
  cartItems,
  couponCode = null,
  userId = null,
  deliveryType = "standard",
}) => {
  let originalSubtotal = 0; // sum of original prices × qty
  let offerDiscount = 0; // total offer savings (line-level, qty already baked in)

  for (const item of cartItems) {
    const offer = await calculateItemOffer(
      item.productId,
      item.variantId,
      item.quantity,
    );

    originalSubtotal += item.price * item.quantity; // item.price = original cart price
    offerDiscount += offer.offerDiscount; // already × qty from offerService
  }

  /* Post-offer subtotal — this is what Order.subtotal stores */
  const subtotal = originalSubtotal - offerDiscount;

  let couponDiscount = 0;
  let coupon = null;
  let couponError = null;

  if (couponCode && userId) {
    const couponResult = await validateCoupon(
      couponCode,
      subtotal, // coupon validated against post-offer subtotal
      userId,
    );

    if (couponResult.success) {
      couponDiscount = couponResult.discount;
      coupon = couponResult.coupon;
    } else {
      couponError = couponResult.message;
    }
  }

  const discountedSubtotal = subtotal - couponDiscount;

  /* DELIVERY */
  let deliveryCharge;

  if (cartItems.length === 0) {
    deliveryCharge = 0;
  } else if (deliveryType === "express") {
    deliveryCharge = 500;
  } else {
    deliveryCharge = discountedSubtotal >= 5000 ? 0 : 99;
  }

  /* TAX — 2% on post-coupon subtotal */
  const taxAmount = Math.floor(discountedSubtotal * 0.02);

  /* FINAL */
  const finalAmount = discountedSubtotal + deliveryCharge + taxAmount;

  return {
    originalSubtotal, // pre-offer total (for pricingSnapshot label if needed)
    subtotal, // post-offer, pre-coupon  ← stored as Order.subtotal
    offerDiscount,
    couponDiscount,
    deliveryCharge,
    taxAmount,
    finalAmount,
    coupon,
    couponError,
  };
};
