const errorHandler = (err, req, res, next) => {
  console.error("Server Error:", err.stack);

  if (req.originalUrl.startsWith("/admin")) {
    return res.status(500).render("admin/error-404");
  }

  return res.status(500).render("user/error-404");
};

export default errorHandler;
