import User from "../models/User.js";

const userBlockCheckMiddleware = async (req, res, next) => {
  try {
    /* =========================
       Skip ADMIN routes
       Use originalUrl (always the full path) instead of
       req.path which can be relative to the router mount point
    ========================= */

    if (req.originalUrl.startsWith("/admin")) {
      return next();
    }

    /* =========================
       Skip static files
    ========================= */

    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
      return next();
    }

    /* =========================
       If user not logged in
    ========================= */

    if (!req.session || !req.session.userId) {
      return next();
    }

    /* =========================
       Skip if this is an admin session
       (extra safety — prevents admin session being wiped)
    ========================= */

    if (req.session.adminId) {
      return next();
    }

    /* =========================
       Find user (reuse from authMiddleware if available)
    ========================= */

    const user = req.user || (await User.findById(req.session.userId));

    /* =========================
       If blocked
    ========================= */

    if (!user || user.isBlocked) {
      /* Remove only USER session key */
      delete req.session.userId;

      /* AJAX request */
      if (
        req.xhr ||
        (req.headers.accept && req.headers.accept.includes("json")) ||
        !req.accepts("html")
      ) {
        return res.status(403).json({
          message: "User blocked",
        });
      }

      /* Redirect to HOME */
      return res.redirect("/");
    }

    next();
  } catch (error) {
    console.log("User Block Check Error:", error);
    next();
  }
};

export default userBlockCheckMiddleware;
