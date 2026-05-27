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

      if (!req.session.userId) {
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
    }

    /* =========================
   CHECK BLOCKED USER
========================= */

    const user = await User.findById(req.session.userId);

    if (!user || user.isBlocked) {
      /* Remove only user session */

      delete req.session.userId;

      /* Redirect to HOME as guest */

      return res.redirect("/");
    }

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
