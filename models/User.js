import mongoose from "mongoose"

const userSchema = new mongoose.Schema({

  fullName: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  password: {
    type: String,
    required: true
  },

  dateOfBirth: {
    type: Date
  },

  isBlocked: {
    type: Boolean,
    default: false
  },

  phoneNumber: {
    type: String
  },

  profilePhoto: {
    type: String
  }

}, { timestamps: true })


const User =
  mongoose.model("User", userSchema)


export default User