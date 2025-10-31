import prisma from '../../libs/db';
import { Reminder, ReminderCreationData } from './reminder-types';
import { mapPrismaReminderToReminder } from './reminder-mapper';
import { Prisma } from '../../generated/prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { reminders } from '../../generated/prisma/client';

export const findAllByUserId = async (userId: string): Promise<Reminder[]> => {
  const prismaReminders = await prisma.reminders.findMany({
    where: {
      user_id: userId,
    },
  });
  return prismaReminders.map(mapPrismaReminderToReminder);
};

export const findById = async (id: string): Promise<reminders | null> => {
  return await prisma.reminders.findUnique({
    where: { id },
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

export const add = async (newReminder: ReminderCreationData): Promise<Reminder> => {
  const dataToCreate: Prisma.remindersCreateInput = {
    id: uuidv4(),
    users: newReminder.user, // Connect user
    pets: newReminder.pet, // Connect pet
    reminder_categories: newReminder.reminder_categories, // Connect category
    reminder_name: newReminder.reminderName,
    description: newReminder.description,
    reminder_date: new Date(newReminder.reminderDate),
    reminder_time: newReminder.reminderTime ? new Date(`2000-01-01T${newReminder.reminderTime}Z`) : null, // ได้มาแค่เวลาเลยใส่ date ไว้ อาจจะเปลี่ยน requset ให้มาเป็น timestamp ถ้าทำได้
    status_updated_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  const createdPrismaReminder = await prisma.reminders.create({
    data: dataToCreate,
  });
  return mapPrismaReminderToReminder(createdPrismaReminder);
};