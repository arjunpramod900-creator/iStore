import {
  adminLoginService,
  sendAdminOTPService,
  verifyAdminOTPService,
  resetAdminPasswordService,
} from "../../services/admin/authService.js";

/* ============================
   RENDER LOGIN PAGE
============================ */

export const renderAdminLogin = (req, res) => {
  res.render("admin/login");
};

/* ============================
   ADMIN LOGIN
============================ */

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await adminLoginService(email, password);

    /* SESSION */

    req.session.adminId = admin._id;

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    res.status(400).json({
      success: false,

      message: error.message,
    });
  }
};

/* ============================
   ADMIN LOGOUT
============================ */

export const adminLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Admin Logout Error:", err);

      return res.redirect("/admin/dashboard");
    }

    res.clearCookie(
      "connect.sid",

      {
        path: "/",
      },
    );

    res.redirect("/admin/login");
  });
};

/* ============================
   RENDER FORGOT PASSWORD
============================ */

export const renderForgotPassword = (req, res) => {
  res.render("admin/forgot-password");
};

/* ============================
   SEND ADMIN OTP
============================ */

export const sendAdminOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const otp = await sendAdminOTPService(email);

    /* STORE SESSION */

    req.session.adminOTP = otp;

    req.session.adminEmail = email;

    res.json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    res.status(400).json({
      success: false,

      message: error.message,
    });
  }
};

/* ============================
   RENDER OTP PAGE
============================ */

export const renderAdminOTP = (req, res) => {
  if (!req.session.adminOTP) {
    return res.redirect("/admin/forgot-password");
  }

  res.render("admin/otp");
};

/* ============================
   VERIFY ADMIN OTP
============================ */

export const verifyAdminOTP = (req, res) => {
  try {
    const enteredOTP = req.body.otp;

    const isValid = verifyAdminOTPService(
      enteredOTP,

      req.session.adminOTP,
    );

    if (isValid) {
      req.session.adminOTPVerified = true;

      return res.redirect("/admin/reset-password");
    }

    return res.redirect("/admin/otp");
  } catch (error) {
    console.log(error);

    res.redirect("/admin/forgot-password");
  }
};

/* ============================
   RENDER RESET PASSWORD
============================ */

export const renderAdminResetPassword = (req, res) => {
  if (!req.session.adminOTPVerified) {
    return res.redirect("/admin/forgot-password");
  }

  res.render("admin/reset-password");
};

/* ============================
   RESET PASSWORD
============================ */

export const resetAdminPassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.send("Passwords do not match");
    }

    await resetAdminPasswordService(
      req.session.adminEmail,

      password,
    );

    /* CLEAR SESSION */

    req.session.adminOTP = null;

    req.session.adminOTPVerified = null;

    req.session.adminEmail = null;

    res.redirect("/admin/login");
  } catch (error) {
    console.log(error);

    res.send("Password reset failed");
  }
};

/* ================================
   RENDER ADMIN DASHBOARD
================================ */

export const renderAdminDashboard = (req, res) => {
  try {
    if (!req.session.adminId) {
      return res.redirect("/admin/login");
    }

    /* CACHE FIX */

    res.setHeader(
      "Cache-Control",

      "no-store, no-cache, must-revalidate, proxy-revalidate, private",
    );

    res.setHeader("Pragma", "no-cache");

    res.setHeader("Expires", "0");

    res.render(
      "admin/dashboard",

      {
        page: "dashboard",
      },
    );
  } catch (error) {
    console.log(error);

    res.redirect("/admin/login");
  }
};
