import bcrypt from "bcrypt"

import Admin from "../../models/Admin.js"
import sendEmail from "../../services/emailService.js"



/* ============================
   RENDER LOGIN PAGE
============================ */

export const renderAdminLogin = (

req,
res

) => {

res.render("admin/login")

}



/* ============================
   ADMIN LOGIN
============================ */

export const adminLogin =
async (req, res) => {

try {

const {
email,
password
} = req.body



/* FIND ADMIN */

const admin =
await Admin.findOne({ email })

if (!admin) {

return res.status(400).json({

success: false,

message: "Admin not found"

})

}



/* PASSWORD CHECK */

const isMatch =
await bcrypt.compare(
password,
admin.password
)

if (!isMatch) {

return res.status(400).json({

success: false,

message: "Incorrect password"

})

}



/* CREATE SESSION */

req.session.adminId =
admin._id



/* SEND JSON RESPONSE */

res.status(200).json({

success: true

})

}

catch (error) {

console.log(error)

res.status(500).json({

success: false,

message: "Login failed"

})

}

}

/* ============================
   ADMIN LOGOUT
============================ */

export const adminLogout = (

req,
res

) => {

req.session.destroy(() => {

res.redirect("/admin/login")

})

}


/* ============================
   RENDER FORGOT PASSWORD
============================ */

export const renderForgotPassword = (

req,
res

) => {

res.render(
"admin/forgot-password"
)

}



/* ============================
   SEND ADMIN OTP
============================ */

export const sendAdminOTP = async (

req,
res

) => {

try {

const { email } = req.body



/* CHECK ADMIN */

const admin =
await Admin.findOne({ email })

if (!admin) {

return res.status(400).json({

success: false,

message: "Admin email not found"

})

}



/* GENERATE OTP */

const otp =
Math.floor(
100000 + Math.random() * 900000
)



/* STORE IN SESSION */

req.session.adminOTP =
otp

req.session.adminEmail =
email

/* SEND EMAIL */

await sendEmail(

email,

"Admin Password Reset OTP",

`Your Admin OTP is: ${otp}`

)

/* TEMP LOG (easy otp on terminal) */

console.log(

"Admin OTP:",
otp

)



res.json({

success: true

})

}

catch (error) {

console.log(error)

res.status(500).json({

success: false,

message: "Server Error"

})

}

}

/* ============================
   RENDER OTP PAGE
============================ */

export const renderAdminOTP = (

req,
res

) => {

if (!req.session.adminOTP) {

return res.redirect(
"/admin/forgot-password"
)

}

res.render(
"admin/otp"
)

}



/* ============================
   VERIFY ADMIN OTP
============================ */
export const verifyAdminOTP = (req, res) => {

try {

const enteredOTP = req.body.otp



/* DEBUG LOG */

console.log("Entered OTP:", enteredOTP)

console.log("Session OTP:", req.session.adminOTP)



/* CHECK OTP */

if (enteredOTP == req.session.adminOTP) {

console.log("OTP Verified ✅")



/* 🔴 THIS LINE IS CRITICAL */

req.session.adminOTPVerified = true



/* REDIRECT TO RESET PAGE */

return res.redirect(
"/admin/reset-password"
)

}



else {

console.log("OTP Incorrect ❌")

return res.redirect(
"/admin/otp"
)

}

}

catch (error) {

console.log(error)

res.redirect(
"/admin/forgot-password"
)

}

}
/* ============================
    RENDER RESET PASSWORD PAGE
============================ */


export const renderAdminResetPassword =
(req, res) => {

if (!req.session.adminOTPVerified) {

return res.redirect(
"/admin/forgot-password"
)

}

res.render(
"admin/reset-password"
)

}

/* ============================
    RESET PASSWORD
============================ */

export const resetAdminPassword =
async (req, res) => {

try {

const {
password,
confirmPassword
} = req.body



/* PASSWORD MATCH CHECK */

if (password !== confirmPassword) {

return res.send(
"Passwords do not match"
)

}



/* HASH PASSWORD */

const hashedPassword =
await bcrypt.hash(
password,
10
)



/* UPDATE ADMIN */

await Admin.findOneAndUpdate(

{
email:
req.session.adminEmail
},

{
password:
hashedPassword
}

)



/* CLEAR SESSION */

req.session.adminOTP = null
req.session.adminOTPVerified = null
req.session.adminEmail = null



/* SUCCESS */

res.redirect(
"/admin/login"
)

}

catch (error) {

console.log(error)

res.send(
"Password reset failed"
)

}

}

/* ================================
   RENDER ADMIN DASHBOARD
================================ */

export const renderAdminDashboard =
(req, res) => {

try {

/* CHECK SESSION */

if (!req.session.adminId) {

return res.redirect(
"/admin/login"
)

}

/* LOAD DASHBOARD */

res.render(
"admin/dashboard",
{

page: "dashboard"

}
)

}

catch (error) {

console.log(error)

res.redirect(
"/admin/login"
)

}

}