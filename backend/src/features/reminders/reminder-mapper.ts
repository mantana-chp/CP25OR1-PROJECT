import { Reminder } from './reminder-types';
import { reminder_status } from '../../generated/prisma/enums'; // Import from generated enums

// Define the type that Prisma returns for the 'reminders' model
interface PrismaReminder {
  id: string;
  user_id: string;
  pet_id: string;
  category_id: string;
  reminder_name: string | null;
  description: string | null;
  reminder_date: Date;
  reminder_time: Date | null;
  reminder_status: reminder_status;
  status_done_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export const mapPrismaReminderToReminder = (prismaReminder: PrismaReminder): Reminder => {
  return {
    id: prismaReminder.id,
    userId: prismaReminder.user_id,
    petId: prismaReminder.pet_id,
    categoryId: prismaReminder.category_id,
    reminderName: prismaReminder.reminder_name ?? undefined,
    description: prismaReminder.description ?? undefined,
    reminderDate: prismaReminder.reminder_date,
    reminderTime: prismaReminder.reminder_time ? prismaReminder.reminder_time.toISOString().slice(11, 19) : undefined,
    reminderStatus: prismaReminder.reminder_status,
    statusDoneAt: prismaReminder.status_done_at ?? undefined,
    createdAt: prismaReminder.created_at,
    updatedAt: prismaReminder.updated_at,
  };
};
