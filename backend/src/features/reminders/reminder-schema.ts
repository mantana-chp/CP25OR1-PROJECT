import { z } from 'zod';
import { category_name } from '../../generated/prisma/client';

const simpleReminderObject = z.object({
  reminderName: z.string().min(1, 'Reminder Name is required'),
  description: z.string().optional(),
  reminderDate: z.string().min(1, 'Reminder Date is required'),
  reminderTime: z.string().optional(),
  categoryName: z.enum(category_name).optional(),
});

export const createReminderSchema = z.object({
  body: z.object({
    petId: z.uuid(),
    reminderName: z.string().min(1, 'Reminder Name is required'),
    description: z.string().optional(),
    reminderDate: z.string().min(1, 'Reminder Date is required'),
    reminderTime: z.string().optional(),
    categoryName: z.enum(category_name).optional(),
    children: z.array(simpleReminderObject).optional(),
  }),
});

export const getReminderByIdSchema = z.object({
  id: z.uuid({ message: "Invalid reminder ID format" }),
});

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
  }),
});

export type CreateReminderPayload = z.infer<typeof createReminderSchema.shape.body>;
export type UpdateReminderPayload = z.infer<typeof updateReminderSchema.shape.body>;