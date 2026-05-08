import bcrypt from "bcrypt"

import Admin from "../../models/Admin.js"

import sendEmail
from "../emailService.js"



/* ============================
   ADMIN LOGIN
============================ */

export const adminLoginService =
async (email, password) => {

const admin =
await Admin.findOne({ email })



if (!admin) {

throw new Error(
"Admin not found"
)

}



const isMatch =
await bcrypt.compare(

password,
admin.password

)



if (!isMatch) {

throw new Error(
"Incorrect password"
)

}



return admin

}



/* ============================
   SEND ADMIN OTP
============================ */

export const sendAdminOTPService =
async (email) => {

const admin =
await Admin.findOne({ email })



if (!admin) {

throw new Error(
"Admin email not found"
)

}



/* GENERATE OTP */

const otp =
Math.floor(
100000 + Math.random() * 900000
)



/* SEND EMAIL */

await sendEmail(

email,

"Admin Password Reset OTP",

`Your Admin OTP is: ${otp}`

)



console.log(
"Admin OTP:",
otp
)



return otp

}



/* ============================
   VERIFY ADMIN OTP
============================ */

export const verifyAdminOTPService =
(

enteredOTP,
sessionOTP

) => {

return enteredOTP == sessionOTP

}



/* ============================
   RESET PASSWORD
============================ */

export const resetAdminPasswordService =
async (

email,
password

) => {

const hashedPassword =
await bcrypt.hash(
password,
10
)



await Admin.findOneAndUpdate(

{ email },

{

password:
hashedPassword

}

)

}