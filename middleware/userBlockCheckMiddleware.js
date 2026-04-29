import User from "../models/User.js"

const userBlockCheckMiddleware = async (req, res, next) => {
  try {
    /* Skip admin routes */
    if (req.originalUrl.startsWith("/admin")) {
      return next()
    }
    
    /* Not logged user */
    if (!req.session.userId) {
      return next()
    }
    
    /* Find user */
    const user = await User.findById(req.session.userId)
    
    if (!user || user.isBlocked) {
      // Unset only the user session so admin session remains intact
      delete req.session.userId;
      
      // Explicitly save the session to ensure express-session commits the deletion
      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
        return res.redirect("/")
      });
      return;
    }
    
    next()
  } catch (error) {
    console.log("User Block Check Error:", error)
    next()
  }
}

export default userBlockCheckMiddleware
