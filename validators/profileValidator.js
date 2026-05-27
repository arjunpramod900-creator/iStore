import { z } from "zod";

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name cannot exceed 50 characters")
    .regex(/^[A-Za-z ]+$/, "Name can contain only letters and spaces"),

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

  dateOfBirth: z.string().optional().or(z.literal("")),
});
