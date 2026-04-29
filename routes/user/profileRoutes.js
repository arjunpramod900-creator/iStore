import express from "express"

import upload from "../../utils/multer.js"

import User from "../../models/User.js"

import authController
from "../../controllers/user/authController.js"

import {
  loadEditProfile,
  updateProfile
} from "../../controllers/user/profileController.js"

import {
  loadAddresses,
  addAddress,
  deleteAddress,
  updateAddress
} from "../../controllers/user/addressController.js"

import {
  isLoggedIn
} from "../../middleware/authMiddleware.js"

import userBlockCheckMiddleware
from "../../middleware/userBlockCheckMiddleware.js"

const router = express.Router()



// Add this RIGHT before router.use(isLoggedIn, userBlockCheckMiddleware)
router.use((req, res, next) => {
  if (req.originalUrl.startsWith("/admin")) return next("router")
  next()
})

router.use(isLoggedIn, userBlockCheckMiddleware)
/* =========================
   APPLY USER SECURITY
========================= */

router.use(
  isLoggedIn,
  userBlockCheckMiddleware
)



/* =========================
   LOAD EDIT PROFILE PAGE
========================= */

router.get(
"/edit-profile",
loadEditProfile
)



/* =========================
   UPDATE PROFILE
========================= */

router.post(
"/update-profile",
upload.single("profilePhoto"),
updateProfile
)



/* =========================
   CHANGE EMAIL PAGE
========================= */

router.get(
"/change-email",

async (req, res) => {

try {

const user =
await User.findById(
req.session.userId
)

if (!user) {

return res.redirect("/login")

}

res.render(
"user/change-email",
{ user }
)

}

catch (error) {

console.log(
"Load Change Email Error:",
error
)

res.redirect("/profile")

}

}
)



/* =========================
   SEND EMAIL CHANGE OTP
========================= */

router.post(
"/send-email-change-otp",
authController.sendEmailChangeOTP
)



/* =========================
   LOAD OTP PAGE
========================= */

router.get(
"/verify-email-otp",

(req, res) => {

res.render(
"user/verify-emailpass-otp",
{

newEmail:
req.session.newEmail || "",

flow:
req.query.flow || "email"

}

)

}
)



/* =========================
   VERIFY EMAIL CHANGE OTP
========================= */

router.post(
"/verify-email-change-otp",
authController.verifyEmailChangeOTP
)



/* =========================
   LOAD CHANGE PASSWORD PAGE
========================= */

router.get(
"/change-password",

(req, res) => {

res.render(
"user/change-password"
)

}
)



/* =========================
   SEND PASSWORD CHANGE OTP
========================= */

router.post(
"/send-change-password-otp",
authController.sendChangePasswordOTP
)



/* =========================
   VERIFY PASSWORD CHANGE OTP
========================= */

router.post(
"/verify-change-password-otp",
authController.verifyChangePasswordOTP
)



/* =========================
   LOAD ADDRESSES PAGE
========================= */

router.get(
"/addresses",
loadAddresses
)



/* =========================
   ADD ADDRESS
========================= */

router.post(
"/add-address",
addAddress
)



/* =========================
   DELETE ADDRESS
========================= */

router.get(
"/delete-address/:id",
deleteAddress
)



/* =========================
   UPDATE ADDRESS
========================= */

router.post(
"/edit-address/:id",
updateAddress
)



export default router