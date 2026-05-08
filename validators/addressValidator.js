import { z } from "zod"

export const addressSchema = z.object({

  fullName: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name too long")
    .regex(/^[A-Za-z ]+$/, "Only letters allowed"),

  phoneNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, "Phone must be 10 digits"),

  addressLine1: z
    .string()
    .trim()
    .min(5, "Address too short")
    .max(100, "Address too long"),

  city: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[A-Za-z ]+$/, "Invalid city"),

  state: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[A-Za-z ]+$/, "Invalid state"),

  pincode: z
    .string()
    .regex(/^[0-9]{6}$/, "Invalid PIN code"),

  country: z
    .string()
    .min(2, "Country required"),

  type: z.enum(["Home", "Work", "Other"]),

  isDefault: z
    .optional()
    .transform(val => val === "true" || val === true)

})