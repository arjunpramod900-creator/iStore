import { z } from "zod";

export const variantSchema = z.object({
  SKU: z

    .string()

    .trim()

    .min(
      3,

      "SKU is required",
    )

    .max(
      50,

      "SKU is too long",
    ),

  storage: z
    .string({ required_error: "Storage is required" })
    .trim()
    .min(1, "Storage is required")
    .regex(/^\d+(GB|TB)$/i, "e.g. 256GB or 1TB"),

  color: z
    .string({ required_error: "Color is required" })
    .trim()
    .min(2, "Enter a valid color name")
    .max(30, "Color name is too long")
    .regex(/^[A-Za-z ]+$/, "Only letters and spaces are allowed"),

  RAM: z
    .string({ required_error: "RAM is required" })
    .trim()
    .min(1, "RAM is required")
    .regex(/^\d+GB$/i, "e.g. 8GB or 16GB"),

  stock: z.coerce

    .number()

    .min(
      0,

      "Stock cannot be negative",
    ),

  price: z.coerce

    .number()

    .min(
      1,

      "Price must be greater than 0",
    ),

  comparePrice: z.coerce

    .number()

    .min(0)

    .optional(),

  discountPercentage: z.coerce

    .number()

    .min(0)

    .max(
      100,

      "Discount cannot exceed 100%",
    )

    .optional(),

  images: z

    .array(z.string())

    .optional(),

  isDefault: z

    .union([z.boolean(), z.string()])

    .optional()

    .transform((val) => val === true || val === "true"),

  isActive: z

    .union([z.boolean(), z.string()])

    .optional()

    .transform((val) => val === true || val === "true"),
});
