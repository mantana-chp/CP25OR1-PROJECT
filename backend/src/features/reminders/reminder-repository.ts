import prisma from '../../libs/db';
import { Reminder, ReminderWithPetName } from './reminder-types';
import { mapPrismaReminderToReminder, mapPrismaReminderWithPetToReminder } from './reminder-mapper';
import { Prisma, reminder_status, reminders } from '../../generated/prisma/client';

// Define a type that includes the 'pets' relation for the parent and the direct children
export type ReminderWithPetPayload = Prisma.remindersGetPayload<{
  include: {
    pets: true;
    children: true;
  };
}>;

export const findAllByUserId = async (userId: string): Promise<ReminderWithPetName[]> => {
  const prismaReminders = await prisma.reminders.findMany({
    where: {
      user_id: userId,
      parent_id: null, // Only fetch top-level reminders
    },
    include: {
      pets: true,
      children: true, // Include children, but not their pets
    },
  });
  return prismaReminders.map(mapPrismaReminderWithPetToReminder);
};

export const findById = async (id: string): Promise<ReminderWithPetPayload | null> => {
  return await prisma.reminders.findUnique({
    where: { id },
    include: {
      pets: true,
      children: true, // Include children, but not their pets
    },
  });
};

export const findByUniqueFields = async (
  petId: string,
  reminderName: string,
  reminderDate: Date,
  reminderTime: Date | null
): Promise<reminders | null> => {
  return await prisma.reminders.findFirst({
    where: {
      pet_id: petId,
      reminder_name: reminderName,
      reminder_date: reminderDate,
      reminder_time: reminderTime,
    },
  });
};

export const deleteById = async (id: string): Promise<void> => {
  await prisma.reminders.delete({
    where: { id },
  });
};

export const getReminderCount = async (): Promise<number> => {
  return prisma.reminders.count();
};

export const add = async (data: Prisma.remindersCreateInput): Promise<Reminder> => {
  const createdPrismaReminder = await prisma.reminders.create({
    data,
  });
  return mapPrismaReminderToReminder(createdPrismaReminder);
};

export const update = async (id: string, data: Prisma.remindersUpdateInput): Promise<Reminder> => {
  const updatedPrismaReminder = await prisma.reminders.update({
    where: { id },
    data,
  });
  return mapPrismaReminderToReminder(updatedPrismaReminder);
};

export const updateStatusForIds = async (ids: string[], status: reminder_status) => {
  return await prisma.reminders.updateMany({
    where: {
      id: { in: ids },
    },
    data: {
      reminder_status: status,
    },
  });
};