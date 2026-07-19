import multer from "multer";

/* =========================
   MEMORY STORAGE
   Files are kept in RAM as buffers.
   Works on all platforms (local, Render, Railway, etc.)
   without needing a writable disk directory.
========================= */

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, /* 5 MB */
  },
});

export default upload;
