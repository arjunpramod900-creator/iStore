import { z } from "zod";

/* =========================
   Signup Validation Schema
========================= */

export const signupSchema = z
  .object({
    /* =========================
     FULL NAME
  ========================= */

    fullName: z
      .string()
      .trim()

      /* Minimum characters */

      .min(3, "Name must be at least 3 characters")

      /* Maximum characters */

      .max(50, "Name cannot exceed 50 characters")

      /* Prevent spaces-only names */

      .refine(
        (val) => val.replace(/\s/g, "").length > 0,

        {
          message: "Name cannot be empty or only spaces",
        },
      ),

    /* =========================
     PHONE NUMBER (OPTIONAL)
  ========================= */

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

        {
          message: "Phone number must be exactly 10 digits",
        },
      ),

    /* =========================
     EMAIL
  ========================= */

    email: z
      .string()
      .trim()

      .max(100, "Email cannot exceed 100 characters")

      .email("Invalid email address"),

    /* =========================
     PASSWORD
  ========================= */

    password: z
      .string()

      .min(6, "Password must be at least 6 characters")

      .max(50, "Password cannot exceed 50 characters"),

    confirmPassword: z.string(),
  })

  /* =========================
   PASSWORD MATCH CHECK
========================= */

  .refine(
    (data) => data.password === data.confirmPassword,

    {
      message: "Passwords do not match",

      path: ["confirmPassword"],
    },
  );
