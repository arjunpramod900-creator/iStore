/* =========================
   CHECK USER LOGGED IN
========================= */

export const isLoggedIn = (req, res, next) => {

if (!req.session.userId) {

res.setHeader(
"Cache-Control",
"no-store"
)

return res.redirect("/login")

}

next()

}

/* =========================
   PREVENT LOGGED USERS
========================= */

export const isLoggedOut = (

  req,
  res,
  next

) => {

  if (req.session.userId) {

    return res.redirect("/")

  }

  next()

}



/* =========================
   CHECK RESET VERIFIED
========================= */

export const isResetVerified = (

  req,
  res,
  next

) => {

  if (!req.session.resetVerified) {

    return res.redirect("/login")

  }

  next()

}