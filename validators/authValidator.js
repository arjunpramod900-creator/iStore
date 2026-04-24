import { z } from "zod"



/* =========================
   Signup Validation Schema
========================= */

export const signupSchema = z.object({

  fullName: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters"),

  phoneNumber: z
    .string()
    .trim()
    .regex(
      /^[0-9]{10}$/,
      "Phone number must be exactly 10 digits"
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