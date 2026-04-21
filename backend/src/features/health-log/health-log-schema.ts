import { z } from 'zod';

export const HealthLogCategoryEnum = z.enum(['WEIGHT', 'SYMPTOMS', 'BEHAVIOR']);

export const createHealthLogSchema = z.object({
  body: z.object({
    category: HealthLogCategoryEnum,
    description: z.string().min(1, 'Description is required').max(5000, 'Description is too long'),
    weight: z.number().positive('Weight must be positive').optional(),
    note: z.string().max(2000, 'Note is too long').optional(),
    loggedAt: z.coerce.date().optional(),
    upsert: z.boolean().optional()
  }).superRefine((data, ctx) => {
    if (data.category === 'WEIGHT' && (data.weight === undefined || data.weight === null)) {
      ctx.addIssue({
        code: "custom",
        message: 'Weight is required for WEIGHT category',
        path: ['weight']
      });
    }

    // Check if loggedAt is not in the future (with 2 minute buffer for clock skew)
    if (data.loggedAt) {
      const now = new Date();
      const maxAllowedDate = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes buffer

      if (data.loggedAt > maxAllowedDate) {
        ctx.addIssue({
          code: "custom",
          message: 'Date cannot be in the future',
          path: ['loggedAt']
        });
      }
    }
  })
})

export const updateHealthLogSchema = z.object({
  body: z.object({
    category: HealthLogCategoryEnum.optional(),
    description: z.string().min(1, 'Description is required').max(5000, 'Description is too long').optional(),
    weight: z.number().positive('Weight must be positive').optional(),
    note: z.string().max(2000, 'Note is too long').optional().nullable(),
    // loggedAt is intentionally excluded — the timestamp is immutable after creation
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

export const getWeightChartQuerySchema = z.object({
  view: z.enum(['week', 'month', 'year']).default('month'),
  date: z.coerce.date().optional()   // anchor date — defaults to today in service
})

export type GetWeightChartQuery = z.infer<typeof getWeightChartQuerySchema>
