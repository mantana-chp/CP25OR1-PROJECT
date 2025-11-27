import { z } from 'zod';
import { category_name } from '../../generated/prisma/client';

export const createReminderSchema = z.object({
  body: z.object({
    reminderName: z.string().min(1, 'Reminder Name is required'),
    description: z.string().optional(),
    reminderDate: z.string().min(1, 'Reminder Date is required'),
    reminderTime: z.string().optional(),
    categoryName: z.enum(category_name).optional(),
    parentId: z.uuid().optional(),
  }),
});

export const getReminderByIdSchema = z.object({
  id: z.uuid({ message: "Invalid reminder ID format" }),
});

export type CreateReminderPayload = z.infer<typeof createReminderSchema.shape.body>;