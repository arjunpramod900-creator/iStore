import express from "express"

const router =
express.Router()

import {

renderAdminLogin,
adminLogin,
adminLogout,
renderForgotPassword,
sendAdminOTP,
renderAdminOTP,
verifyAdminOTP,
renderAdminResetPassword,
resetAdminPassword,
renderAdminDashboard

}

from "../../controllers/admin/adminAuthController.js"

import adminAuthMiddleware
from "../../middleware/adminAuthMiddleware.js"

import adminLoggedOut
from "../../middleware/adminLoggedOut.js"

/* ============================
   LOGIN PAGE
============================ */
router.get(
"/login",
adminLoggedOut,
renderAdminLogin
)

/* ============================
   LOGIN POST
============================ */

router.post(

"/login",

adminLogin

)


/* ============================
   FORGOT PASSWORD PAGE
============================ */

router.get(

"/forgot-password",

renderForgotPassword

)



/* ============================
   SEND OTP
============================ */

router.post(

"/send-otp",

sendAdminOTP

)

/* ============================
   OTP PAGE
============================ */

router.get(

"/verify-otp",

renderAdminOTP

)



/* ============================
   VERIFY OTP
============================ */

router.post(

"/verify-otp",

verifyAdminOTP

)

/* ============================
   RESET PASSWORD PAGE
============================ */
router.get(
"/reset-password",
renderAdminResetPassword
)

/* ============================
   PASSWORD RESET
============================ */
router.post(
"/reset-password",
resetAdminPassword
)

/* ============================
   DASHBOARD
============================ */

router.get(
"/dashboard",
adminAuthMiddleware,
renderAdminDashboard,
)

/* ============================
   LOGOUT
============================ */

router.get(

"/logout",

adminLogout

)

export default router


//for safari//
router.get(
"/check-session",

(req, res) => {

if (!req.session.adminId) {

return res.json({
active: false
})

}

res.json({
active: true
})

}
)