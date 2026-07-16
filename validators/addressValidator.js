import { z } from "zod";

export const addressSchema = z.object({
  fullName: z
    .string({
      required_error: "Please enter your full name",
    })
    .trim()
    .min(3, "Full name must contain at least 3 characters")
    .max(50, "Full name cannot exceed 50 characters")
    .regex(/^[A-Za-z ]+$/, "Full name can only contain letters and spaces"),

  phoneNumber: z
    .string({
      required_error: "Please enter your mobile number",
    })
    .trim()
    .regex(/^[0-9]{10}$/, "Please enter a valid 10-digit mobile number"),

  addressLine1: z
    .string({
      required_error: "Please enter your street address",
    })
    .trim()
    .min(5, "Street address is too short")
    .max(100, "Street address cannot exceed 100 characters"),

  city: z
    .string({
      required_error: "Please enter your city",
    })
    .trim()
    .min(2, "City name is too short")
    .max(50, "City name is too long")
    .regex(/^[A-Za-z ]+$/, "Please enter a valid city name"),

  state: z
    .string({
      required_error: "Please enter your state",
    })
    .trim()
    .min(2, "State name is too short")
    .max(50, "State name is too long")
    .regex(/^[A-Za-z ]+$/, "Please enter a valid state name"),

  pincode: z
    .string({
      required_error: "Please enter your PIN code",
    })
    .trim()
    .regex(/^[0-9]{6}$/, "Please enter a valid 6-digit PIN code"),

  country: z
    .string({
      required_error: "Please select a country",
    })
    .min(2, "Please select a country"),

  type: z.enum(["Home", "Work", "Other"], {
    errorMap: () => ({ message: "Please select an address type" }),
  }),

  // FIX: z.optional() alone is invalid — must be z.string().optional()
  // Also handle the case where isDefault is absent entirely (unchecked checkbox
  // sends nothing, so the field won't exist in req.body at all)
  isDefault: z
    .string()
    .optional()
    .transform((val) => val === "true" || val === true),
});
