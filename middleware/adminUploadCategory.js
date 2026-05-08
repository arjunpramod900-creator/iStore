import multer from "multer"

/* =========================
   MEMORY STORAGE
========================= */

const storage = multer.memoryStorage()

/* =========================
   FILE FILTER
========================= */

const fileFilter = (req, file, cb) => {

  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
  ]

  if (allowedMimeTypes.includes(file.mimetype)) {

    cb(null, true)

  } else {

    cb(
      new Error("Only JPG, PNG and WEBP images are allowed"),
      false
    )

  }

}

/* =========================
   MULTER INSTANCE
========================= */

const uploadCategory = multer({

  storage,

  fileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024
  }

})

export default uploadCategory