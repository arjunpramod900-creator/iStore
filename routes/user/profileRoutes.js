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




// router.use((req, res, next) => {
//   if (req.originalUrl.startsWith("/admin")) return next("router")
//   next()
// })

// router.use(isLoggedIn, userBlockCheckMiddleware)



/* =========================
   LOAD EDIT PROFILE PAGE
========================= */

router.get(
"/edit-profile",
isLoggedIn,
userBlockCheckMiddleware,
loadEditProfile
)



/* =========================
   UPDATE PROFILE
========================= */

router.post(
"/update-profile",
isLoggedIn,
userBlockCheckMiddleware,
upload.single("profilePhoto"),
updateProfile
)



/* =========================
   CHANGE EMAIL PAGE
========================= */

router.get(
"/change-email",
isLoggedIn,
userBlockCheckMiddleware,

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
isLoggedIn,
userBlockCheckMiddleware,
authController.sendEmailChangeOTP
)



/* =========================
   LOAD OTP PAGE
========================= */

router.get(
"/verify-email-otp",
isLoggedIn,
userBlockCheckMiddleware,

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
isLoggedIn,
userBlockCheckMiddleware,
authController.verifyEmailChangeOTP
)



/* =========================
   LOAD CHANGE PASSWORD PAGE
========================= */
router.get(
"/change-password",
isLoggedIn,
userBlockCheckMiddleware,
async (req, res) => {

try {

const user =
await User.findById(
req.session.userId
)

if (!user) {

return res.redirect("/login")

}

/* PASS USER TO EJS */

res.render(
"user/change-password",
{ user }

)

}

catch (error) {

console.log(
"Change Password Load Error:",
error
)

res.redirect("/profile")

}

}
)
/* =========================
   SEND PASSWORD CHANGE OTP
========================= */

router.post(
"/send-change-password-otp",
isLoggedIn,
userBlockCheckMiddleware,
authController.sendChangePasswordOTP
)



/* =========================
   VERIFY PASSWORD CHANGE OTP
========================= */

router.post(
"/verify-change-password-otp",
isLoggedIn,
userBlockCheckMiddleware,
authController.verifyChangePasswordOTP
)



/* =========================
   LOAD ADDRESSES PAGE
========================= */

router.get(
"/addresses",
isLoggedIn,
userBlockCheckMiddleware,
loadAddresses
)



/* =========================
   ADD ADDRESS
========================= */

router.post(
"/add-address",
isLoggedIn,
userBlockCheckMiddleware,
addAddress
)



/* =========================
   DELETE ADDRESS
========================= */

router.get(
"/delete-address/:id",
isLoggedIn,
userBlockCheckMiddleware,
deleteAddress
)



/* =========================
   UPDATE ADDRESS
========================= */

router.post(
"/edit-address/:id",
isLoggedIn,
userBlockCheckMiddleware,
updateAddress
)



export default router