import User from "../../models/User.js";
import OTP from "../../models/OTP.js";
import Product from "../../models/Product.js";
import Variant from "../../models/Variant.js";
import Category from "../../models/Category.js";
import Wishlist from "../../models/Wishlist.js";
import Cart from "../../models/Cart.js";

import { calculateItemOffer } from "../../services/shared/offerService.js";

import generateOTP from "../../utils/generateOTP.js";
import sendEmail from "../../services/emailService.js";
import generateReferralCode from "../../utils/generateReferralCode.js";
import { creditWallet } from "../../services/shared/walletService.js";

import bcrypt from "bcrypt";

import {
  signupSchema,
  loginSchema,
  resendOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../../validators/authValidator.js";

/* ================================
   LOAD PAGES
================================ */

const loadSignup = (req, res) => {
  const referralCode = req.query.ref || "";
  res.render("user/signup", { referralCode });
};

const loadLogin = (req, res) => {
  res.render("user/login", { error: req.query.error });
};

const loadForgotPassword = (req, res) => {
  res.render("user/forgot-password");
};

const loadResetPassword = (req, res) => {
  if (!req.session.resetVerified) {
    return res.redirect("/login");
  }
  res.render("user/reset-password");
};

/* ================================
   LOAD HOME PAGE
================================ */

const loadHome = async (req, res) => {
  try {
    const categories = await Category.find({
      isDeleted: false,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    /* FEATURED PRODUCTS */
    let featuredProducts = await Product.find({
      isFeatured: true,
      isDeleted: false,
      isActive: true,
    })
      .populate("categoryId")
      .limit(8)
      .lean();

    if (!featuredProducts.length) {
      featuredProducts = await Product.find({
        isDeleted: false,
        isActive: true,
      })
        .populate("categoryId")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean();
    }

    for (const product of featuredProducts) {
      const variant = await Variant.findOne({
        productId: product._id,
        isDeleted: false,
        isActive: true,
        stock: { $gt: 0 },
      }).lean();
      if (!variant) continue;
      product.variant = variant;
      product.offerData = await calculateItemOffer(product, variant);
    }

    featuredProducts = featuredProducts.filter((product) => product.variant);

    /* BEST SELLERS */
    let bestSellerProducts = await Product.find({
      isBestSeller: true,
      isDeleted: false,
      isActive: true,
    })
      .populate("categoryId")
      .limit(8)
      .lean();

    if (!bestSellerProducts.length) {
      bestSellerProducts = await Product.find({
        isDeleted: false,
        isActive: true,
      })
        .populate("categoryId")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean();
    }

    for (const product of bestSellerProducts) {
      const variant = await Variant.findOne({
        productId: product._id,
        isDeleted: false,
        isActive: true,
        stock: { $gt: 0 },
      }).lean();
      if (!variant) continue;
      product.variant = variant;
      product.offerData = await calculateItemOffer(product, variant);
    }

    bestSellerProducts = bestSellerProducts.filter((product) => product.variant);

    /* DEAL PRODUCTS */
    let dealProducts = await Product.find({
      isDeal: true,
      isDeleted: false,
      isActive: true,
    })
      .populate("categoryId")
      .limit(3)
      .lean();

    for (const product of dealProducts) {
      const variant = await Variant.findOne({
        productId: product._id,
        isDeleted: false,
        isActive: true,
        stock: { $gt: 0 },
      }).lean();
      if (!variant) continue;
      product.variant = variant;
      product.offerData = await calculateItemOffer(product, variant);
    }

    dealProducts = dealProducts.filter((product) => product.variant);

    /* WISHLIST & CART IDS */
    let wishlistVariantIds = [];
    let cartVariantIds = [];

    if (req.session.userId) {
      const wishlist = await Wishlist.findOne({ userId: req.session.userId });
      if (wishlist) {
        wishlistVariantIds = wishlist.items.map((item) =>
          item.variantId.toString()
        );
      }

      const cart = await Cart.findOne({ userId: req.session.userId });
      if (cart) {
        cartVariantIds = cart.items.map((item) => item.variantId.toString());
      }
    }

    res.render("user/home", {
      page: "home",
      categories,
      featuredProducts,
      bestSellerProducts,
      dealProducts,
      wishlistVariantIds,
      cartVariantIds,
    });
  } catch (error) {
    console.log("Load Home Error:", error);
    res.redirect("/");
  }
};

/* ================================
   LOAD PROFILE PAGE
================================ */

const loadProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);

    if (!user) return res.redirect("/login");

    const referralLink = `${req.protocol}://${req.get("host")}/signup?ref=${user.referralCode}`;

    res.render("user/profile", {
      user,
      referralCode: user.referralCode || "",
      referralCount: user.referralCount || 0,
      referralRewards: user.referralRewardEarned || 0,
      referralLink,
    });
  } catch (error) {
    console.log("Profile Load Error:", error);
    res.redirect("/");
  }
};

const loadEditProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render("user/edit-profile", { user });
  } catch (error) {
    console.log("Edit Profile Load Error:", error);
    res.redirect("/profile");
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber, dateOfBirth } = req.body;
    await User.findByIdAndUpdate(req.session.userId, {
      fullName,
      phoneNumber,
      dateOfBirth,
    });
    res.redirect("/profile");
  } catch (error) {
    console.log("Update Profile Error:", error);
    res.redirect("/profile");
  }
};

/* ================================
   SEND SIGNUP OTP
================================ */

const sendSignupOTP = async (req, res) => {
  try {
    if (req.body.phoneNumber === "") {
      req.body.phoneNumber = undefined;
    }

    const result = signupSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.errors[0].message,
      });
    }

    const { fullName, phoneNumber, email, password, referralCode } = result.data;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    await OTP.deleteMany({ email, type: "signup" });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 300000);

    await OTP.create({ email, code: otp, type: "signup", expiresAt });

    req.session.signupData = {
      fullName,
      phoneNumber,
      email,
      password,
      referralCode,
    };

    await sendEmail(
      email,
      "Signup OTP Verification",
      `Your signup OTP is ${otp}. It expires in 5 minutes.`
    );

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully. Please check your email.",
    });
  } catch (error) {
    console.log("Signup OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

/* ================================
   RESEND OTP
   Handles resend for both signup
   and forgot-password flows without
   requiring the full form data again
================================ */

const resendOTP = async (req, res) => {
  try {
    const result = resendOTPSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.errors[0].message,
      });
    }

    const { email, type } = result.data;

    /* Validate session still holds the matching data */
    if (type === "signup") {
      if (!req.session.signupData || req.session.signupData.email !== email) {
        return res.status(400).json({
          success: false,
          message: "Session expired. Please fill the signup form again.",
        });
      }
    }

    if (type === "forgotPassword") {
      if (!req.session.resetEmail || req.session.resetEmail !== email) {
        return res.status(400).json({
          success: false,
          message: "Session expired. Please request a new password reset.",
        });
      }
    }

    /* Remove old OTP */
    await OTP.deleteMany({ email, type });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 300000);

    await OTP.create({ email, code: otp, type, expiresAt });

    const subject =
      type === "signup" ? "Signup OTP Verification" : "Password Reset OTP";

    await sendEmail(
      email,
      subject,
      `Your OTP is ${otp}. It expires in 5 minutes.`
    );

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully. Please check your email.",
    });
  } catch (error) {
    console.log("Resend OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP. Please try again.",
    });
  }
};

/* ================================
   VERIFY SIGNUP OTP
   FIX: match by email + code,
   not just code alone
================================ */

const verifySignupOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp || otp.trim().length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit OTP",
      });
    }

    const signupData = req.session.signupData;

    if (!signupData || !signupData.email) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please sign up again.",
      });
    }

    /* Match by BOTH email and code — prevents cross-account OTP reuse */
    const storedOTP = await OTP.findOne({
      email: signupData.email,
      code: otp.trim(),
      type: "signup",
    }).sort({ createdAt: -1 });

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    if (storedOTP.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    /* Double-check user doesn't already exist */
    const existingUser = await User.findOne({ email: signupData.email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(signupData.password, 10);

    let referredByUser = null;
    if (signupData.referralCode && typeof signupData.referralCode === "string") {
      const referralCode = signupData.referralCode.trim();
      if (referralCode && referralCode !== "null" && referralCode !== "undefined") {
        referredByUser = await User.findOne({ referralCode });
      }
    }

    const newUser = await User.create({
      fullName: signupData.fullName,
      phoneNumber: signupData.phoneNumber,
      email: signupData.email,
      password: hashedPassword,
      referralCode: generateReferralCode(signupData.fullName),
      referredBy: referredByUser?._id || null,
      referralRewardEarned: referredByUser ? 100 : 0,
    });

    await OTP.deleteMany({ email: signupData.email, type: "signup" });

    if (referredByUser) {
      await creditWallet({
        userId: referredByUser._id,
        amount: 200,
        transactionType: "ReferralBonus",
        description: `Referral reward for inviting ${newUser.fullName}`,
      });

      await creditWallet({
        userId: newUser._id,
        amount: 100,
        transactionType: "ReferralBonus",
        description: "Welcome referral bonus",
      });

      referredByUser.referralCount += 1;
      referredByUser.referralRewardEarned += 200;
      await referredByUser.save();
    }

delete req.session.signupData;

req.session.save((err) => {

  if (err) {

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again."
    });

  }

  return res.status(200).json({
    success: true,
    message: "Signup successful! Please login."
  });

});
  } catch (error) {
    console.log("OTP Verification Error:", error);
    return res.status(500).json({
      success: false,
      message: "OTP verification failed. Please try again.",
    });
  }
};

/* ================================
   LOGIN USER
================================ */

const loginUser = async (req, res) => {
  try {
    /* Validate inputs */
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.errors[0].message,
      });
    }

    const { email, password } = result.data;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "No account found with this email",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked. Please contact support.",
      });
    }

    /* Google users have no password */
    if (!user.password) {
      return res.status(400).json({
        success: false,
        message: "This account uses Google Sign-In. Please login with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    req.session.userId = user._id;

    return res.status(200).json({
      success: true,
      message: "Login successful",
    });
  } catch (error) {
    console.log("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

/* ================================
   FORGOT PASSWORD - SEND OTP
================================ */

const sendForgotOTP = async (req, res) => {
  try {
    /* Validate email from body or fall back to session */
    let email = req.body?.email || req.session.resetEmail;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const emailResult = forgotPasswordSchema.safeParse({ email });
    if (!emailResult.success) {
      return res.status(400).json({
        success: false,
        message: emailResult.error.errors[0].message,
      });
    }

    email = emailResult.data.email;

    const user = await User.findOne({ email });

    if (!user) {
      /* Generic message to avoid email enumeration */
      return res.status(400).json({
        success: false,
        message: "If this email is registered, an OTP will be sent.",
      });
    }

    await OTP.deleteMany({ email, type: "forgotPassword" });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 300000);

    await OTP.create({ email, code: otp, type: "forgotPassword", expiresAt });

    req.session.resetEmail = email;

    await sendEmail(
      email,
      "Password Reset OTP",
      `Your password reset OTP is ${otp}. It expires in 5 minutes.`
    );

    return res.status(200).json({
      success: true,
      message: "OTP sent. Please check your email.",
    });
  } catch (error) {
    console.log("Forgot OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

/* ================================
   VERIFY RESET OTP
   FIX: match by email + code
================================ */

const verifyResetOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp || otp.trim().length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit OTP",
      });
    }

    const email = req.session.resetEmail;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please request a new password reset.",
      });
    }

    /* Match by BOTH email and code */
    const storedOTP = await OTP.findOne({
      email,
      code: otp.trim(),
      type: "forgotPassword",
    }).sort({ createdAt: -1 });

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    if (storedOTP.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    req.session.resetVerified = true;

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.log("Reset OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Verification failed. Please try again.",
    });
  }
};

/* ================================
   RESET PASSWORD
================================ */

const resetPassword = async (req, res) => {
  try {
    const result = resetPasswordSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error.errors[0].message,
      });
    }

    if (!req.session.resetVerified) {
      return res.status(400).json({
        success: false,
        message: "OTP not verified. Please verify your OTP first.",
      });
    }

    const email = req.session.resetEmail;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please restart the password reset process.",
      });
    }

    const hashedPassword = await bcrypt.hash(result.data.newPassword, 10);

    await User.updateOne({ email }, { password: hashedPassword });

    await OTP.deleteMany({ email, type: "forgotPassword" });

    delete req.session.resetEmail;
    delete req.session.resetVerified;

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please login.",
    });
  } catch (error) {
    console.log("Reset Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Password reset failed. Please try again.",
    });
  }
};

/* ================================
   SEND EMAIL CHANGE OTP
================================ */

const sendEmailChangeOTP = async (req, res) => {
  try {
    let newEmail;
    let confirmEmail;

    if (req.body && req.body.newEmail) {
      newEmail = req.body.newEmail?.trim();
      confirmEmail = req.body.confirmEmail?.trim();
      req.session.newEmail = newEmail;
    } else {
      newEmail = req.session.newEmail;
      confirmEmail = req.session.newEmail;
    }

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "New email is required",
      });
    }

    if (newEmail !== confirmEmail) {
      return res.status(400).json({
        success: false,
        message: "Emails do not match",
      });
    }

    const existingUser = await User.findOne({ email: newEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "This email is already in use",
      });
    }

    await OTP.deleteMany({ email: newEmail, type: "emailChange" });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 300000);

    await OTP.create({ email: newEmail, code: otp, type: "emailChange", expiresAt });

    await sendEmail(
      newEmail,
      "Email Change OTP",
      `Your email change OTP is ${otp}. It expires in 5 minutes.`
    );

    res.redirect("/verify-email-otp?flow=email");
  } catch (error) {
    console.log("Email Change OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

/* ================================
   VERIFY EMAIL CHANGE OTP
================================ */

const verifyEmailChangeOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp || otp.trim().length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit OTP",
      });
    }

    const newEmail = req.session.newEmail;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please restart the email change process.",
      });
    }

    /* Match by email + code */
    const storedOTP = await OTP.findOne({
      email: newEmail,
      code: otp.trim(),
      type: "emailChange",
    }).sort({ createdAt: -1 });

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    if (storedOTP.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    await User.findByIdAndUpdate(req.session.userId, { email: newEmail });

    await OTP.deleteMany({ email: newEmail, type: "emailChange" });

    delete req.session.newEmail;

    return res.status(200).json({
      success: true,
      message: "Email updated successfully.",
    });
  } catch (error) {
    console.log("Verify Email OTP Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP. Please try again.",
    });
  }
};

/* ================================
   SEND CHANGE PASSWORD OTP
================================ */

const sendChangePasswordOTP = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (newPassword.length > 50) {
      return res.status(400).json({
        success: false,
        message: "Password cannot exceed 50 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const user = await User.findById(userId);
    if (!user) return res.redirect("/login");

    if (!user.googleId) {
      if (!oldPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required",
        });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 300000);

    await OTP.deleteMany({ email: user.email, type: "changePassword" });
    await OTP.create({ email: user.email, code: otp, type: "changePassword", expiresAt });

    req.session.newPassword = newPassword;

    await sendEmail(
      user.email,
      "Change Password OTP",
      `Your password change OTP is ${otp}. It expires in 5 minutes.`
    );

    res.redirect("/verify-email-otp?flow=password");
  } catch (error) {
    console.log("Change Password OTP Error:", error);
    res.redirect("/change-password");
  }
};

/* ================================
   VERIFY CHANGE PASSWORD OTP
================================ */

const verifyChangePasswordOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp || otp.trim().length !== 6) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 6-digit OTP",
      });
    }

    const userId = req.session.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    /* Match by email + code */
    const storedOTP = await OTP.findOne({
      email: user.email,
      code: otp.trim(),
      type: "changePassword",
    }).sort({ createdAt: -1 });

    if (!storedOTP) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please check and try again.",
      });
    }

    if (storedOTP.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (!req.session.newPassword) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please restart the password change process.",
      });
    }

    const hashedPassword = await bcrypt.hash(req.session.newPassword, 10);

    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    await OTP.deleteMany({ email: user.email, type: "changePassword" });

    delete req.session.newPassword;

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.log("Verify Change Password Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP. Please try again.",
    });
  }
};

/* ================================
   LOGOUT USER
================================ */

const logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("Logout Error:", err);
      return res.redirect("/");
    }
    res.clearCookie("user.sid");
    res.redirect(303, "/");
  });
};

/* ================================
   EXPORT
================================ */

export default {
  loadSignup,
  loadLogin,
  loadForgotPassword,
  loadResetPassword,

  sendSignupOTP,
  resendOTP,
  verifySignupOTP,

  loginUser,

  sendForgotOTP,
  verifyResetOTP,
  resetPassword,

  logoutUser,

  loadHome,

  loadProfile,
  loadEditProfile,
  updateProfile,
  sendEmailChangeOTP,
  verifyEmailChangeOTP,
  sendChangePasswordOTP,
  verifyChangePasswordOTP,
};