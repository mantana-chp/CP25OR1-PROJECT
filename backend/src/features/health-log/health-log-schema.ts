import { z } from 'zod';

export const createHealthLogSchema = z.object({
  body: z.object({
    description: z.string().min(1, 'Description is required').max(5000, 'Description is too long'),
    weight: z.number().positive('Weight must be positive').optional(),
    note: z.string().max(2000, 'Note is too long').optional(),
    loggedAt: z.coerce.date().optional()
  })
})

export const updateHealthLogSchema = z.object({
  body: z.object({
    description: z.string().min(1, 'Description is required').max(5000, 'Description is too long').optional(),
    weight: z.number().positive('Weight must be positive').optional(),
    note: z.string().max(2000, 'Note is too long').optional().nullable(),
    loggedAt: z.coerce.date().optional()
  })
})

export const petIdParamsSchema = z.object({
  petId: z.uuid('Invalid pet ID format')
})

export const healthLogIdParamsSchema = z.object({
  petId: z.uuid('Invalid pet ID format'),
  logId: z.uuid('Invalid log ID format')
})

export const getHealthLogsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 50 // Default limit
      const num = parseInt(val, 10)
      return isNaN(num) ? 50 : Math.min(num, 100) // Max 100
    }),
  offset: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return 0
      const num = parseInt(val, 10)
      return isNaN(num) ? 0 : num
    })
})

export type CreateHealthLogPayload = z.infer<
  typeof createHealthLogSchema
>['body']
export type UpdateHealthLogPayload = z.infer<
  typeof updateHealthLogSchema
>['body']
export type GetHealthLogsQuery = z.infer<typeof getHealthLogsQuerySchema>
