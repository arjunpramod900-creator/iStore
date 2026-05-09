import { z } from "zod"

export const productSchema = z.object({

name: z

.string()

.trim()

.min(

3,

"Product name must be at least 3 characters"

)

.max(

100,

"Product name cannot exceed 100 characters"

),



description: z

.string()

.trim()

.min(

10,

"Description must be at least 10 characters"

)

.max(

3000,

"Description is too long"

),



categoryId: z

.string()

.trim()

.min(

1,

"Category is required"

),



thumbnail: z

.string()

.optional(),



isFeatured: z

.union([

z.boolean(),
z.string()

])

.optional()

.transform(val =>

val === true ||

val === "true"

),



isBestSeller: z

.union([

z.boolean(),
z.string()

])

.optional()

.transform(val =>

val === true ||

val === "true"

),



isDeal: z

.union([

z.boolean(),
z.string()

])

.optional()

.transform(val =>

val === true ||

val === "true"

),



isActive: z

.union([

z.boolean(),
z.string()

])

.optional()

.transform(val =>

val === true ||

val === "true"

)

})