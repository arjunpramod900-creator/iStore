import { z } from "zod"

export const profileSchema = z.object({

  fullName: z
    .string()
    .min(3),

  phoneNumber: z
    .string()
    .min(10)
    .max(10),

  dateOfBirth: z.string()

})