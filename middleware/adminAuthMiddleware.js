const adminAuthMiddleware = (

req,
res,
next

) => {

if (!req.session.adminId) {

return res.redirect(
"/admin/login"
)

}

next()

}

export default adminAuthMiddleware