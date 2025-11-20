import { Reminder, ReminderWithPetName } from './reminder-types';
import { reminder_status, category_name } from '../../generated/prisma/client';

interface PrismaReminder {
  id: string;
  user_id: string;
  pet_id: string;
  category_name: category_name;
  reminder_name: string | null;
  description: string | null;
  reminder_date: Date;
  reminder_time: Date | null;
  reminder_status: reminder_status;
  status_done_at: Date | null;
  created_at: Date;
  updated_at: Date;
  is_health: boolean;
}
interface PrismaReminderWithPet extends PrismaReminder {
  pets: { pet_name: string } | null;
}

export const mapPrismaReminderToReminder = (prismaReminder: PrismaReminder): Reminder => {
  return {
    id: prismaReminder.id,
    userId: prismaReminder.user_id,
    petId: prismaReminder.pet_id,
    categoryName: prismaReminder.category_name,
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

export const mapPrismaReminderWithPetToReminder = (prismaReminder: PrismaReminderWithPet): ReminderWithPetName => {
  if (!prismaReminder.pets) {
    // just for safety
    throw new Error(`Data integrity error: Reminder ${prismaReminder.id} is missing its associated pet.`);
  }
  return {
    ...mapPrismaReminderToReminder(prismaReminder),
    pet_name: prismaReminder.pets.pet_name,
  };
};
