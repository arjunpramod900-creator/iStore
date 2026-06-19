import express from "express";

import { isLoggedIn }              from "../../middleware/authMiddleware.js";
import userBlockCheckMiddleware    from "../../middleware/userBlockCheckMiddleware.js";

import {
  loadCheckoutPage,
  placeOrder,
  verifyRazorpayPayment,
  loadOrderSuccessPage,
  applyCoupon,
  removeCoupon,
} from "../../controllers/user/checkoutController.js";

const router = express.Router();

const auth = [isLoggedIn, userBlockCheckMiddleware];

/* =========================================
   CHECKOUT — new order flow
========================================= */
router.get( "/checkout",              ...auth, loadCheckoutPage);
router.post("/checkout/place-order",  ...auth, placeOrder);
router.post("/checkout/apply-coupon", ...auth, applyCoupon);
router.post("/checkout/remove-coupon",...auth, removeCoupon);

/* =========================================
   RAZORPAY VERIFICATION
   Shared by new checkout AND retry flow.
   Both flows store the order by razorpayOrderId
   so this single endpoint handles both.
========================================= */
router.post("/checkout/verify-payment", ...auth, verifyRazorpayPayment);

/* =========================================
   ORDER SUCCESS
========================================= */
router.get("/order-success/:orderId", ...auth, loadOrderSuccessPage);

export default router;