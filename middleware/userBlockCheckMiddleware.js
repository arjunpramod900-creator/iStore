import User from "../models/User.js"

const userBlockCheckMiddleware = async (req, res, next) => {
  try {
    /* Skip admin routes */
    if (req.originalUrl.startsWith("/admin")) {
      return next()
    }

    /* Skip static assets to prevent background requests from triggering session modifications */
    if (req.originalUrl.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
      return next()
    }
    
    /* Not logged user */
    if (!req.session || !req.session.userId) {
      return next()
    }
    
    /* Find user */
    const user = await User.findById(req.session.userId)
    
    if (!user || user.isBlocked) {
      // Unset the user session
      delete req.session.userId;
      
      // Prevent redirecting AJAX/API requests
      if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1) || !req.accepts('html')) {
          return res.status(403).send("Blocked");
      }
      
      return res.redirect("/")
    }
    
    next()
  } catch (error) {
    console.log("User Block Check Error:", error)
    next()
  }
}

export default userBlockCheckMiddleware
