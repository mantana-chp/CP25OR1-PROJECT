import { z } from 'zod';

export const createReminderSchema = z.object({
  // user: z.object({
  //   connect: z.object({
  //     id: z.string().uuid("User ID must be a valid UUID"),
  //   }),
  // }),
  // pet: z.object({
  //   connect: z.object({
  //     id: z.string().uuid("Pet ID must be a valid UUID"),
  //   }),
  // }),
  // reminder_categories: z.object({
  //   connect: z.object({
  //     id: z.string().uuid("Category ID must be a valid UUID"),
  //   }),
  // }),
  reminderName: z.string().min(1, "Reminder Name is required"),
  description: z.string().optional(),
  reminderDate: z.string().min(1, "Reminder Date is required"),
  reminderTime: z.string().optional(),
});

export const getReminderByIdSchema = z.object({
  id: z.uuid({ message: "Invalid reminder ID format" }),
});

export type CreateReminderPayload = z.infer<typeof createReminderSchema>;