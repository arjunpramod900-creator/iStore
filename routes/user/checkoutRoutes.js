import express from "express";

import { isLoggedIn }              from "../../middleware/authMiddleware.js";
import userBlockCheckMiddleware    from "../../middleware/userBlockCheckMiddleware.js";

import {
  loadCheckoutPage,
  loadRetryCheckoutPage,
  placeOrder,
  verifyRazorpayPayment,
  loadOrderSuccessPage,
  loadOrderFailurePage,
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
   RETRY CHECKOUT
========================================= */
router.get(
  "/orders/:orderId/retry",
  ...auth,
  loadRetryCheckoutPage
);

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

/* =========================================
   ORDER FAILURE
========================================= */
router.get("/order-failure/:orderId", ...auth, loadOrderFailurePage);

export default router;