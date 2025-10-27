import { z } from 'zod';

export const createReminderSchema = z.object({
  title: z.string().min(1, "Reminder Name is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  description: z.string().optional(),
  petId: z.string().min(1, "Pet ID is required"),
});

export type CreateReminderPayload = z.infer<typeof createReminderSchema>;