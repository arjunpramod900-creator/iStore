import { z } from "zod"



export const variantSchema = z.object({

SKU: z

.string()

.trim()

.min(3, "SKU is required")

.max(50),



storage: z

.string()

.trim()

.optional(),



color: z

.string()

.trim()

.optional(),



RAM: z

.string()

.trim()

.optional(),



stock: z

.coerce

.number()

.min(0, "Stock cannot be negative"),



price: z

.coerce

.number()

.min(1, "Price must be greater than 0"),



comparePrice: z

.coerce

.number()

.min(0)

.optional(),



discountPercentage: z

.coerce

.number()

.min(0)

.max(100)

.optional(),



isDefault: z

.union([

z.boolean(),

z.string()

])

.optional(),



isActive: z

.union([

z.boolean(),

z.string()

])

.optional()

})