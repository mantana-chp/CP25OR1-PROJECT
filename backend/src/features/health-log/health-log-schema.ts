import { z } from 'zod';

export const HealthLogCategoryEnum = z.enum(['WEIGHT', 'SYMPTOMS', 'BEHAVIOR']);

export const createHealthLogSchema = z.object({
  body: z.object({
    category: HealthLogCategoryEnum,
    description: z.string().min(1, 'Description is required').max(5000, 'Description is too long'),
    weight: z.number().positive('Weight must be positive').optional(),
    note: z.string().max(2000, 'Note is too long').optional(),
    loggedAt: z.coerce.date().max(new Date(), 'Date cannot be in the future').optional()
  }).superRefine((data, ctx) => {
    if (data.category === 'WEIGHT' && (data.weight === undefined || data.weight === null)) {
      ctx.addIssue({
        code: "custom",
        message: 'Weight is required for WEIGHT category',
        path: ['weight']
      });
    }
  })
})

export const updateHealthLogSchema = z.object({
  body: z.object({
    category: HealthLogCategoryEnum.optional(),
    description: z.string().min(1, 'Description is required').max(5000, 'Description is too long').optional(),
    weight: z.number().positive('Weight must be positive').optional(),
    note: z.string().max(2000, 'Note is too long').optional().nullable(),
    loggedAt: z.coerce.date().max(new Date(), 'Date cannot be in the future').optional()
  }).superRefine((data, ctx) => {
    // If category is being updated to WEIGHT, weight must be provided
    if (data.category === 'WEIGHT' && (data.weight === undefined || data.weight === null)) {
      ctx.addIssue({
        code: "custom",
        message: 'Weight is required when updating to WEIGHT category',
        path: ['weight']
      });
    }
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
