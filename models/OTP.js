import mongoose from "mongoose"

const otpSchema = new mongoose.Schema(

  {

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    code: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: [
        "signup",
        "forgotPassword",
        "emailVerification"
      ],
      required: true
    },

    expiresAt: {
      type: Date,
      required: true
    }

  },

  {

    timestamps: true

  }

)



/* =================================
   TTL INDEX (AUTO DELETE OTP)
================================= */

otpSchema.index(

  { expiresAt: 1 },

  {

    expireAfterSeconds: 0

  }

)



/* =================================
   INDEX FOR FAST SEARCH
================================= */

otpSchema.index(

  {

    email: 1,
    code: 1,
    type: 1

  }

)



const OTP = mongoose.model(

  "OTP",

  otpSchema

)

export default OTP