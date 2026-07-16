import User from "../models/User.js";

/* =========================
   CHECK USER LOGGED IN
========================= */

export const isLoggedIn = async (req, res, next) => {
  try {
    /* Skip admin routes */
    if (req.originalUrl.startsWith("/admin")) {
      return next();
    }

    /* If not logged in */
    if (!req.session.userId) {
      res.setHeader("Cache-Control", "no-store");

      /* AJAX / FETCH REQUEST */
      const isApiRequest =
        req.xhr || req.headers.accept?.includes("application/json");

      if (isApiRequest) {
        return res.status(401).json({
          success: false,
          message: "Please login to continue",
          requiresLogin: true,
        });
      }

      return res.redirect("/login");
    }

    /* =========================
       CHECK BLOCKED USER
       Only runs when userId is confirmed to exist above
    ========================= */

    const user = await User.findById(req.session.userId);

    if (!user || user.isBlocked) {
      /* Remove only user session key */
      delete req.session.userId;

      /* Redirect to HOME as guest */
      return res.redirect("/");
    }

    /* Attach user for downstream middleware */
    req.user = user;

    next();
  } catch (error) {
    console.log("isLoggedIn Middleware Error:", error);
    return res.redirect("/login");
  }
};

/* =========================
   PREVENT LOGGED USERS
========================= */

export const isLoggedOut = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect("/");
  }

  next();
};

/* =========================
   CHECK RESET VERIFIED
========================= */

export const isResetVerified = (req, res, next) => {
  if (!req.session.resetVerified) {
    return res.redirect("/login");
  }

  next();
};
