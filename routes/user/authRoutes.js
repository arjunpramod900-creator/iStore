import express from "express"

import authController
from "../../controllers/user/authController.js"

import passport from "passport"

import {

  isLoggedOut,
  isResetVerified,
  isLoggedIn

} from "../../middleware/authMiddleware.js"

const router = express.Router()



/* =========================
   SIGNUP ROUTES
========================= */

router.get(

  "/signup",

  isLoggedOut,

  authController.loadSignup

)

router.post(

  "/send-otp",

  authController.sendSignupOTP

)



/* =========================
   OTP ROUTES
========================= */

router.get(

  "/verify-otp",

  (req, res) => {

    const type =
      req.query.type || "signup"

    res.render(
      "user/otp",
      { type }
    )

  }

)



/* Verify Signup OTP */

router.post(

  "/verify-otp",

  authController.verifySignupOTP

)



/* Verify Reset OTP */

router.post(

  "/verify-reset-otp",

  authController.verifyResetOTP

)



/* =========================
   LOGIN ROUTES
========================= */

router.get(

  "/login",

  isLoggedOut,

  authController.loadLogin

)

router.post(

  "/login",

  authController.loginUser

)

/* =========================
   GOOGLE AUTH
========================= */

router.get(

"/auth/google",

passport.authenticate(

"google",

{

scope: [

"profile",

"email"

]

}

)

)



router.get(

"/auth/google/callback",

passport.authenticate(

"google",

{

failureRedirect: "/login"

}

),

(req, res) => {

req.session.userId =
req.user._id

res.redirect("/")

}

)



/* =========================
   PROFILE ROUTE
========================= */

router.get(

  "/profile",

  isLoggedIn,

  authController.loadProfile

)



/* =========================
   FORGOT PASSWORD
========================= */

router.get(

  "/forgot-password",

  isLoggedOut,

  authController.loadForgotPassword

)

router.post(

  "/forgot-password",

  authController.sendForgotOTP

)



/* =========================
   RESET PASSWORD
========================= */

router.get(

  "/reset-password",

  isResetVerified,

  authController.loadResetPassword

)

router.post(

  "/reset-password",

  authController.resetPassword

)



/* =========================
   LOGOUT ROUTE
========================= */

router.get(

  "/logout",

  isLoggedIn,

  authController.logoutUser

)



export default router