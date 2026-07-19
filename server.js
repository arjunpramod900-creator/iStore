import dotenv from "dotenv";
dotenv.config();

import express from "express";
import session from "express-session";

import MongoStore from "connect-mongo";

import helmetConfig from "./config/helmet.js";

import connectDB from "./config/db.js";

import userRoutes from "./routes/user/index.js";

import adminRouter from "./routes/admin/index.js";

import localsMiddleware from "./middleware/localsMiddleware.js";

import noCache from "./middleware/noCache.js";

import adminNoCache from "./middleware/adminNoCache.js";

import passport from "./config/passport.js";

import userBlockCheckMiddleware from "./middleware/userBlockCheckMiddleware.js";

import userCountsMiddleware from "./middleware/userCountsMiddleware.js";

import errorHandler from "./middleware/errorHandler.js";

import {
  adminNotFound,
  userNotFound,
} from "./middleware/notFoundMiddleware.js";

const app = express();
/* Trust Nginx reverse proxy */
app.set("trust proxy", 1);

/* ================================
   SECURITY HEADERS
================================ */

app.use(helmetConfig);

/* ================================
   BODY PARSERS
================================ */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  }),
);

/* ================================
   STATIC FILES
================================ */

app.use(express.static("public"));

/* ================================
   SESSION SETUP
   FIX: split into two independent
   sessions (separate cookies/secrets)
   so user logout never destroys the
   admin session, and vice versa.
================================ */

const userSession = session({
  name: "user.sid",
  secret: process.env.SESSION_SECRET || "mySecretKey",

  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "user_sessions",
    ttl: 60 * 60 * 24, // 1 day, in seconds — should match cookie maxAge
  }),

  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
});

const adminSession = session({
  name: "admin.sid",
  secret: process.env.ADMIN_SESSION_SECRET || "myAdminSecretKey",

  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: "admin_sessions",
    ttl: 60 * 60 * 24,
  }),

  resave: false,
  saveUninitialized: false,

  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
});

/* Admin routes get the admin session */
app.use("/admin", adminSession);

/* Everything else gets the user session */
app.use((req, res, next) => {
  if (req.path.startsWith("/admin")) return next();
  userSession(req, res, next);
});

/* ================================

PASSPORT SETUP (ADD HERE)

================================ */

app.use(passport.initialize());

app.use(passport.session());

/* ================================
NO CACHE
================================ */

app.use(noCache);

/* ================================
GLOBAL VARIABLES
================================ */

app.use(localsMiddleware);

app.use(userCountsMiddleware);

/* ================================
VIEW ENGINE
================================ */

app.set("view engine", "ejs");

app.set("views", "./views");

/* ================================
PROTECTED HOME ROUTE
================================ */
app.use("/", userRoutes);

/* ================================

ADMIN ROUTES

================================ */

app.use("/admin", adminRouter);

/* ================================
404 HANDLER
================================ */
app.use("/admin", adminNotFound);

app.use(userNotFound);

/* ============================================================
  General 500 error handler
============================================================ */
app.use(errorHandler);

/* ================================
   START SERVER
================================ */

const PORT = process.env.PORT || 3030;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
