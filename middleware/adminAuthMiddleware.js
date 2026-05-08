const adminAuthMiddleware = (req, res, next) => {

if (!req.session.adminId) {

/* Handle AJAX requests */

if (

req.xhr ||

(req.headers.accept &&
req.headers.accept.includes("json")) ||

!req.accepts("html")

) {

return res.status(401).json({

success: false,

message: "Admin session expired"

})

}



/* Normal page request */

return res.redirect("/admin/login")

}

next()

}

export default adminAuthMiddleware