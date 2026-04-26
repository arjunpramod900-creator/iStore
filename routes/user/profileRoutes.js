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

const router = express.Router()



/* =========================
   LOAD EDIT PROFILE PAGE
========================= */

router.get(
"/edit-profile",
isLoggedIn,
loadEditProfile
)



/* =========================
   UPDATE PROFILE
========================= */

router.post(
"/update-profile",
isLoggedIn,
upload.single("profilePhoto"),
updateProfile
)



/* =========================
   CHANGE EMAIL PAGE
========================= */

router.get(
"/change-email",
isLoggedIn,

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
authController.sendEmailChangeOTP
)



/* =========================
   LOAD OTP PAGE
========================= */

router.get(
"/verify-email-otp",
isLoggedIn,

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
authController.verifyEmailChangeOTP
)



/* =========================
   LOAD CHANGE PASSWORD PAGE
========================= */

router.get(
"/change-password",
isLoggedIn,

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
isLoggedIn,
authController.sendChangePasswordOTP
)



/* =========================
   VERIFY PASSWORD CHANGE OTP
========================= */

router.post(
"/verify-change-password-otp",
isLoggedIn,
authController.verifyChangePasswordOTP
)

/* =========================
   LOAD ADDRESSES PAGE
========================= */
router.get(
"/addresses",
isLoggedIn,
loadAddresses
)
/* =========================
   ADD ADDRESS
========================= */

router.post(
"/add-address",
isLoggedIn,
addAddress
)



/* =========================
   DELETE ADDRESS
========================= */

router.get(
"/delete-address/:id",
isLoggedIn,
deleteAddress
)



/* =========================
   UPDATE ADDRESS
========================= */

router.post(
"/edit-address/:id",
isLoggedIn,
updateAddress
)


export default router