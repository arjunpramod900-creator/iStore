import mongoose from "mongoose"

const categorySchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },

  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  image: {
    type: String,
    default: ""
  },

  isActive: {
    type: Boolean,
    default: true
  },

  isDeleted: {
    type: Boolean,
    default: false
  }

}, { timestamps: true })

/* =========================
   INDEX
========================= */

categorySchema.index({ name: "text" })

const Category =
mongoose.model("Category", categorySchema)

export default Category