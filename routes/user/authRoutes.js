import express from "express";

import authController from "../../controllers/user/authController.js";

import passport from "passport";

import {
  isLoggedOut,
  isResetVerified,
  isLoggedIn,
} from "../../middleware/authMiddleware.js";

const router = express.Router();

/* =========================
   SIGNUP ROUTES
========================= */

router.get("/signup", isLoggedOut, authController.loadSignup);

router.post("/send-otp", authController.sendSignupOTP);

/* =========================
   RESEND OTP
   Handles resend for signup
   and forgotPassword flows.
   Expects { email, type } in body.
========================= */

router.post("/resend-otp", authController.resendOTP);

/* =========================
   OTP ROUTES
========================= */

router.get("/verify-otp", isLoggedOut, (req, res) => {
  const type = req.query.type || "signup";

  if (
    (type === "signup" && !req.session.signupData) ||
    (type === "reset" && !req.session.resetEmail)
  ) {
    return res.redirect("/login");
  }

  const email =
    type === "signup"
      ? req.session.signupData?.email || ""
      : req.session.resetEmail || "";

  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    Pragma: "no-cache",
    Expires: "0",
  });

  res.render("user/otp", {
    type,
    email,
  });
});

/* Verify Signup OTP */
router.post("/verify-otp", authController.verifySignupOTP);

/* Verify Reset OTP */
router.post("/verify-reset-otp", authController.verifyResetOTP);

/* =========================
   LOGIN ROUTES
========================= */

router.get("/login", isLoggedOut, authController.loadLogin);

router.post("/login", authController.loginUser);

/* =========================
   GOOGLE AUTH
========================= */

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      if (info && info.message === "blocked") {
        return res.redirect("/login?error=blocked");
      }
      return res.redirect("/login");
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      req.session.userId = user._id;
      return res.redirect("/?login=success");
    });
  })(req, res, next);
});

/* =========================
   PROFILE ROUTE
========================= */

router.get("/profile", isLoggedIn, authController.loadProfile);

/* =========================
   FORGOT PASSWORD
========================= */

router.get("/forgot-password", isLoggedOut, authController.loadForgotPassword);

router.post("/forgot-password", authController.sendForgotOTP);

/* =========================
   RESET PASSWORD
========================= */

router.get(
  "/reset-password",
  isResetVerified,
  authController.loadResetPassword,
);

router.post("/reset-password", authController.resetPassword);

/* =========================
   CHANGE PASSWORD OTP
========================= */

router.post(
  "/send-change-password-otp",
  isLoggedIn,
  authController.sendChangePasswordOTP,
);

/* =========================
   EMAIL CHANGE OTP
========================= */

router.post(
  "/send-email-change-otp",
  isLoggedIn,
  authController.sendEmailChangeOTP,
);

/* =========================
   LOGOUT ROUTE
========================= */

router.get("/logout", isLoggedIn, authController.logoutUser);

/* =========================
   VERIFY EMAIL / PASSWORD OTP PAGE
========================= */

router.get("/verify-email-otp", isLoggedIn, (req, res) => {
  const flow = req.query.flow;
  res.render("user/verify-emailpass-otp", { flow });
});

export default router;
