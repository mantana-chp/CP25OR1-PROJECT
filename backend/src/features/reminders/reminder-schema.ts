import { z } from 'zod'
import {
  category_name,
  RecurrenceFrequency,
  RecurrenceStatusEnum,
} from '../../generated/prisma/client'

const simpleReminderObject = z.object({
  reminderName: z.string().min(1, 'Reminder Name is required'),
  description: z.string().optional(),
  reminderDate: z.string().min(1, 'Reminder Date is required'),
  reminderTime: z.string().optional(),
  categoryName: z.enum(category_name).optional(),
})

const recurrenceSchema = z.object({
  // --- Series Metadata (NEW) ---
  reminderName: z.string().min(1, 'Reminder Name is required').optional(),
  description: z.string().optional(),
  categoryName: z.enum(category_name).optional(),
  // --- Recurrence Pattern ---
  frequency: z.enum(RecurrenceFrequency),
  interval: z.number().min(1).default(1),
  reminderTime: z.string().optional(),
  daysOfWeek: z.number().optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  // --- End Condition ---
  endDate: z.string().optional(),
  endAfterOccurrences: z.number().min(1).optional(),
})

export const createReminderSchema = z.object({
  body: z.object({
    petId: z
      .union([
        z.uuid(),
        z.array(z.uuid()).min(1, 'At least one pet must be selected'),
      ])
      .transform((v) => (Array.isArray(v) ? v : [v])),
    reminderName: z.string().min(1, 'Reminder Name is required'),
    description: z.string().optional(),
    reminderDate: z.string().min(1, 'Reminder Date is required'),
    reminderTime: z.string().optional(),
    categoryName: z.enum(category_name).optional(),
    children: z.array(simpleReminderObject).optional(),
    recurrence: recurrenceSchema.optional(),
  }),
})

export const getReminderByIdSchema = z.object({
  id: z.uuid({ message: 'Invalid reminder ID format' }),
})

export const deleteReminderSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid reminder ID format' }),
  }),
  query: z.object({
    deleteScope: z.enum(['THIS_INSTANCE_ONLY', 'ALL_INSTANCES']).optional(),
  }),
})

export const updateReminderSchema = z.object({
  params: z.object({
    id: z.uuid({ message: 'Invalid reminder ID format' }),
  }),
  body: z.object({
    petId: z.uuid('Invalid pet ID').optional(),
    reminderName: z.string().min(1, 'Reminder Name is required').optional(),
    description: z.string().optional().nullable(),
    reminderDate: z.string().min(1, 'Reminder Date is required').optional(),
    reminderTime: z.string().optional().nullable(),
    categoryName: z.enum(category_name).optional(),
    children: z
      .array(
        z.object({
          id: z.string().optional(),
          reminderName: z.string().min(1, 'Reminder Name is required'),
          description: z.string().optional(),
          reminderDate: z.string().min(1, 'Reminder Date is required'),
          reminderTime: z.string().optional(),
          categoryName: z.enum(category_name).optional(),
        }),
      )
      .optional(),
    childrenToDelete: z.array(z.string()).optional(),
    // --- FIELDS FOR RECURRENCE ---
    editScope: z
      .enum(['THIS_INSTANCE_ONLY', 'THIS_AND_FUTURE_INSTANCES'])
      .optional(),
    recurrence: recurrenceSchema.optional().nullable(),
  }),
})

export const createMultipleRemindersSchema = z.object({
  body: z
    .array(
      z.object({
        petId: z.uuid(),
        reminderName: z.string().min(1, 'Reminder Name is required'),
        description: z.string().optional(),
        reminderDate: z.string().min(1, 'Reminder Date is required'),
        reminderTime: z.string().optional(),
        categoryName: z.enum(category_name).optional(),
        children: z.array(simpleReminderObject).optional(),
        recurrence: recurrenceSchema.optional(),
      }),
    )
    .min(1, 'At least one reminder must be provided'),
})

export type RecurrencePayload = z.infer<typeof recurrenceSchema>
export type CreateReminderPayload = z.infer<
  typeof createReminderSchema.shape.body
>
export type CreateMultipleRemindersPayload = z.infer<
  typeof createMultipleRemindersSchema.shape.body
>
export type UpdateReminderPayload = z.infer<
  typeof updateReminderSchema.shape.body
>
export type DeleteReminderQuery = z.infer<
  typeof deleteReminderSchema.shape.query
>
