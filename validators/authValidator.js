import { z } from "zod"



/* =========================
   Signup Validation Schema
========================= */

export const signupSchema = z.object({

  fullName: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters"),



  /* PHONE NUMBER (FIXED) */

  phoneNumber: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine(

      (val) => {

        if (!val || val === "") return true

        return /^[0-9]{10}$/.test(val)

      },

      {

        message:
          "Phone number must be exactly 10 digits"

      }

    ),



  email: z
    .string()
    .trim()
    .email("Invalid email address"),



  password: z
    .string()
    .min(
      6,
      "Password must be at least 6 characters"
    ),



  confirmPassword: z
    .string()

})

.refine(

  (data) =>
    data.password === data.confirmPassword,

  {

    message:
      "Passwords do not match",

    path:
      ["confirmPassword"]

  }

)