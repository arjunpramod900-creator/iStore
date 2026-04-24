import User from "../../models/User.js"
import OTP from "../../models/OTP.js"

import generateOTP
from "../../utils/generateOTP.js"

import sendEmail
from "../../services/emailService.js"

import bcrypt from "bcrypt"

import {
signupSchema
} from "../../validators/authValidator.js"



/* ================================
   LOAD PAGES
================================ */

const loadSignup = (req, res) => {

res.render("user/signup")

}

const loadLogin = (req, res) => {

res.render("user/login")

}

const loadForgotPassword = (req, res) => {

res.render("user/forgot-password")

}



/* 🔐 Secure Reset Page */

const loadResetPassword = (req, res) => {

if (!req.session.resetVerified) {

return res.redirect("/login")

}

res.render("user/reset-password")

}

/*LOAD HOME PAGE*/

const loadHome = (req, res) => {

  res.render("user/home")

}

/*LOAD PROFILE PAGE*/


const loadProfile = async (req, res) => {

  try {

    const userId =
      req.session.userId

    const user =
      await User.findById(userId)

    if (!user) {

      return res.redirect("/login")

    }

    res.render("user/profile", {

      user

    })

  }

  catch (error) {

    console.log(
      "Profile Load Error:",
      error
    )

    res.redirect("/")

  }

}

/*LOAD EDIT PROFILE*/

const loadEditProfile = async (

  req,
  res

) => {

  try {

    const user =
      await User.findById(
        req.session.userId
      )

    res.render(
      "user/edit-profile",
      { user }
    )

  }

  catch (error) {

    console.log(
      "Edit Profile Load Error:",
      error
    )

    res.redirect("/profile")

  }

}



/*UPDATE PROFILE*/

const updateProfile = async (

  req,
  res

) => {

  try {

    const {

      fullName,
      phoneNumber,
      dateOfBirth

    } = req.body



    await User.findByIdAndUpdate(

      req.session.userId,

      {

        fullName,

        phoneNumber,

        dateOfBirth

      }

    )



    res.redirect("/profile")

  }

  catch (error) {

    console.log(
      "Update Profile Error:",
      error
    )

    res.redirect("/profile")

  }

}





/* ================================
   SEND SIGNUP OTP
================================ */

const sendSignupOTP = async (req, res) => {

try {

const result =
signupSchema.safeParse(req.body)

if (!result.success) {

return res.status(400).json({

success: false,
message:
result.error.errors[0].message

})

}

const {
fullName,
phoneNumber,
email,
password
} = result.data



const existingUser =
await User.findOne({ email })

if (existingUser) {

return res.status(400).json({

success: false,
message: "User already exists"

})

}



/* Remove old OTPs */

await OTP.deleteMany({

email,
type: "signup"

})



const otp =
generateOTP()

const expiresAt =
new Date(Date.now() + 300000)



await OTP.create({

email,
code: otp,
type: "signup",
expiresAt

})



req.session.signupData = {

fullName,
phoneNumber,
email,
password

}



await sendEmail(

email,
"Signup OTP Verification",
`Your signup OTP is ${otp}`

)



return res.status(200).json({

success: true,
message: "OTP Sent Successfully"

})

}

catch (error) {

console.log(
"Signup OTP Error:",
error
)

return res.status(500).json({

success: false,
message: "Failed to send OTP"

})

}

}



/* ================================
   VERIFY SIGNUP OTP
================================ */

const verifySignupOTP = async (req, res) => {

try {

const { otp } = req.body



const storedOTP =
await OTP.findOne({

code: otp,
type: "signup"

})
.sort({
createdAt: -1
})



if (!storedOTP) {

return res.status(400).json({

success: false,
message: "Invalid OTP"

})

}



if (storedOTP.expiresAt < new Date()) {

return res.status(400).json({

success: false,
message: "OTP Expired"

})

}



const signupData =
req.session.signupData

if (!signupData) {

return res.status(400).json({

success: false,
message: "Session expired"

})

}



const hashedPassword =
await bcrypt.hash(
signupData.password,
10
)



await User.create({

fullName:
signupData.fullName,

phoneNumber:
signupData.phoneNumber,

email:
signupData.email,

password:
hashedPassword

})



await OTP.deleteMany({

email:
signupData.email

})



delete req.session.signupData



return res.status(200).json({

success: true,
message: "Signup Successful"

})

}

catch (error) {

console.log(
"OTP Verification Error:",
error
)

return res.status(500).json({

success: false,
message: "OTP Verification Failed"

})

}

}



/* ================================
   LOGIN USER
================================ */

const loginUser = async (req, res) => {

try {

const {
email,
password
} = req.body



const user =
await User.findOne({ email })



if (!user) {

return res.status(400).json({

success: false,
message: "User not found"

})

}



const isMatch =
await bcrypt.compare(
password,
user.password
)



if (!isMatch) {

return res.status(400).json({

success: false,
message: "Incorrect Password"

})

}



req.session.userId =
user._id



return res.status(200).json({

success: true,
message: "Login Successful"

})

}

catch (error) {

console.log(
"Login Error:",
error
)

return res.status(500).json({

success: false,
message: "Login Failed"

})

}

}



/* ================================
   FORGOT PASSWORD - SEND OTP
================================ */

const sendForgotOTP = async (req, res) => {

try {

let email = req.body.email



if (!email) {

email =
req.session.resetEmail

}



const user =
await User.findOne({ email })



if (!user) {

return res.status(400).json({

success: false,
message: "Email not registered"

})

}



/* Remove old OTPs */

await OTP.deleteMany({

email,
type: "forgotPassword"

})



const otp =
generateOTP()

const expiresAt =
new Date(
Date.now() + 300000
)



await OTP.create({

email,
code: otp,
type: "forgotPassword",
expiresAt

})



req.session.resetEmail =
email



await sendEmail(

email,
"Password Reset OTP",
`Your password reset OTP is ${otp}`

)



return res.status(200).json({

success: true,
message: "Reset OTP Sent"

})

}

catch (error) {

console.log(
"Forgot OTP Error:",
error
)

return res.status(500).json({

success: false,
message: "Failed to send OTP"

})

}

}



/* ================================
   VERIFY RESET OTP
================================ */

const verifyResetOTP = async (req, res) => {

try {

const { otp } = req.body



const storedOTP =
await OTP.findOne({

code: otp,
type: "forgotPassword"

})
.sort({
createdAt: -1
})



if (!storedOTP) {

return res.status(400).json({

success: false,
message: "Invalid OTP"

})

}



if (storedOTP.expiresAt < new Date()) {

return res.status(400).json({

success: false,
message: "OTP Expired"

})

}



/* Save session */

req.session.resetVerified = true
req.session.resetEmail =
storedOTP.email



return res.status(200).json({

success: true,
message: "OTP Verified"

})

}

catch (error) {

console.log(
"Reset OTP Error:",
error
)

return res.status(500).json({

success: false,
message: "Verification Failed"

})

}

}



/* ================================
   RESET PASSWORD
================================ */

const resetPassword = async (req, res) => {

try {

const {
newPassword,
confirmPassword
} = req.body



if (newPassword !== confirmPassword) {

return res.status(400).json({

success: false,
message: "Passwords do not match"

})

}



if (!req.session.resetVerified) {

return res.status(400).json({

success: false,
message: "OTP not verified"

})

}



const email =
req.session.resetEmail



const hashedPassword =
await bcrypt.hash(
newPassword,
10
)



await User.updateOne(

{ email },

{ password: hashedPassword }

)



await OTP.deleteMany({

email,
type: "forgotPassword"

})



delete req.session.resetEmail
delete req.session.resetVerified



return res.status(200).json({

success: true,
message: "Password Reset Successful"

})

}

catch (error) {

console.log(
"Reset Password Error:",
error
)

return res.status(500).json({

success: false,
message: "Password Reset Failed"

})

}

}



/* ================================
   LOGOUT USER
================================ */

const logoutUser = (req, res) => {

req.session.destroy(

(err) => {

if (err) {

console.log(
"Logout Error:",
err
)

return res.redirect("/")

}

res.redirect("/login")

}

)

}



/* ================================
   EXPORT
================================ */

export default {

loadSignup,
loadLogin,
loadForgotPassword,
loadResetPassword,

sendSignupOTP,
verifySignupOTP,

loginUser,

sendForgotOTP,
verifyResetOTP,
resetPassword,

logoutUser,

loadHome,

loadProfile,
loadEditProfile,
updateProfile

}