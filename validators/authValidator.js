import { z } from "zod";

/* =========================
   Signup Validation Schema
========================= */

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters")
      .max(50, "Name cannot exceed 50 characters")
      .refine(
        (val) => val.replace(/\s/g, "").length > 0,
        { message: "Name cannot be empty or only spaces" },
      ),

    phoneNumber: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (val) => {
          if (!val || val === "") return true;
          return /^[0-9]{10}$/.test(val);
        },
        { message: "Phone number must be exactly 10 digits" },
      ),

    email: z
      .string()
      .trim()
      .max(100, "Email cannot exceed 100 characters")
      .email("Invalid email address"),

    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(50, "Password cannot exceed 50 characters"),

    referralCode: z
      .string()
      .trim()
      .optional()
      .or(z.literal("")),

    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/* =========================
   Login Validation Schema
========================= */

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(100, "Email cannot exceed 100 characters")
    .email("Invalid email address"),

  password: z
    .string()
    .min(1, "Password is required")
    .max(50, "Password cannot exceed 50 characters"),
});

/* =========================
   Resend OTP Schema
   (only needs email + type)
========================= */

export const resendOTPSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address"),

  type: z.enum(["signup", "forgotPassword"], {
    errorMap: () => ({ message: "Invalid OTP type" }),
  }),
});

/* =========================
   Forgot Password Schema
========================= */

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .max(100, "Email cannot exceed 100 characters")
    .email("Invalid email address"),
});

/* =========================
   Reset Password Schema
========================= */

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(50, "Password cannot exceed 50 characters"),

    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });