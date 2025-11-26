import { Reminder, ReminderWithPetName } from './reminder-types';
import { Prisma, reminders as PrismaReminder } from '../../generated/prisma/client';

type PrismaReminderWithPet = Prisma.remindersGetPayload<{
  include: { pets: true };
}>;

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
