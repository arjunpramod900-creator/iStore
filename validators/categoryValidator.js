import { z } from "zod";

export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Category name must be at least 3 characters")
    .max(40, "Category name cannot exceed 40 characters"),

  description: z
    .string()
    .trim()
    .max(200, "Description cannot exceed 200 characters")
    .optional()
    .or(z.literal("")),

  isActive: z.union([z.string(), z.boolean()]).optional(),
});
