import dotenv from "dotenv"
dotenv.config()

import express from "express"
import session from "express-session"

import connectDB from "./config/db.js"

import authRoutes from "./routes/user/authRoutes.js"

import profileRoutes from "./routes/user/profileRoutes.js"

import noCache from "./middleware/noCache.js"

import passport from "./config/passport.js"



const app = express()



/* ================================
   CONNECT DATABASE
================================ */

connectDB()



/* ================================
   BODY PARSERS
================================ */

app.use(express.json())

app.use(
  express.urlencoded({
    extended: true
  })
)



/* ================================
   STATIC FILES
================================ */

app.use(
  express.static("public")
)



/* ================================
   SESSION SETUP
================================ */

app.use(

  session({

    secret:
      process.env.SESSION_SECRET
      || "mySecretKey",

    resave: false,

    saveUninitialized: false,

    cookie: {

      httpOnly: true,

      sameSite: "lax",

      secure: false,

      maxAge:
        1000 * 60 * 60 * 24 // 1 day

    }

  })

)

/* ================================

   PASSPORT SETUP (ADD HERE)

================================ */


app.use(passport.initialize())

app.use(passport.session())



/* ================================
   NO CACHE
================================ */

app.use(noCache)



/* ================================
   GLOBAL VARIABLES
================================ */

app.use(

  (req, res, next) => {

    res.locals.userId =
      req.session.userId || null

    next()

  }

)



/* ================================
   VIEW ENGINE
================================ */

app.set(
  "view engine",
  "ejs"
)

app.set(
  "views",
  "./views"
)



/* ================================
   PROTECTED HOME ROUTE
================================ */

app.get(

  "/",

  (req, res) => {

    res.render("user/home")

  }

)



/* ================================
   AUTH ROUTES
================================ */

app.use(

  "/",

  authRoutes

)
app.use(

  "/",

  profileRoutes

)



/* ================================
   404 HANDLER
================================ */

app.use(

  (req, res) => {

    res.status(404).send(

      "404 Page Not Found"

    )

  }

)



/* ================================
   START SERVER
================================ */

const PORT =
  process.env.PORT || 3030

app.listen(

  PORT,

  () => {

    console.log(
      `Server running on port ${PORT}`
    )

    console.log(
      `http://localhost:${PORT}`
    )

  }

)