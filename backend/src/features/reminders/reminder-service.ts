import * as reminderRepository from './reminder-repository';
import { Reminder, CreateReminderInput, ReminderWithPetName } from './reminder-types';
import { mapPrismaReminderWithPetToReminder } from './reminder-mapper';
import { NotFoundError, ApiError, BadRequestError, ConflictError } from '../../shared/errors';
import { Prisma, reminder_status, category_name } from '../../generated/prisma/client';
import prisma from '../../libs/db';

export const getAllReminders = async (userId: string): Promise<ReminderWithPetName[]> => {
  return await reminderRepository.findAllByUserId(userId);
};

export const getReminderById = async (id: string, userId: string): Promise<ReminderWithPetName> => {
  const reminder = await reminderRepository.findById(id);

  if (!reminder) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminder.user_id !== userId) {
    throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);
  }

  return mapPrismaReminderWithPetToReminder(reminder);
};

export const deleteReminder = async (id: string, userId: string): Promise<void> => {
  const reminder = await reminderRepository.findById(id);

  if (!reminder) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminder.user_id !== userId) {
    throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);
  }

  if (reminder.reminder_status === reminder_status.done) {
    throw new BadRequestError('Reminders with status "Done" cannot be deleted.');
  }

  await reminderRepository.deleteById(id);
};

export const createNewReminder = async (newReminderData: CreateReminderInput, userId: string): Promise<Reminder> => {
  const pet = await prisma.pets.findFirst({
    where: { user_id: userId },
  });

  if (!pet) {
    throw new BadRequestError('You must create a pet profile before creating reminders.');
  }

  const reminderDate = new Date(newReminderData.reminderDate);
  const reminderTime = newReminderData.reminderTime ? new Date(`1970-01-01T${newReminderData.reminderTime}Z`) : null;

  const existingReminder = await reminderRepository.findByUniqueFields(
    pet.id,
    newReminderData.reminderName,
    reminderDate,
    reminderTime
  );

  if (existingReminder) {
    throw new ConflictError('A reminder with the same name, date, and time already exists for this pet.');
  }

  const dataToCreate: Prisma.remindersCreateInput = {
    reminder_name: newReminderData.reminderName,
    description: newReminderData.description,
    reminder_date: reminderDate,
    reminder_time: reminderTime,
    category_name: newReminderData.categoryName || category_name.General, // Default to General
    user: { connect: { id: userId } },
    pets: { connect: { id: pet.id } },
  };

  return await reminderRepository.add(dataToCreate);
};

export const toggleReminderStatus = async (id: string, userId: string): Promise<Reminder> => {
  const reminder = await reminderRepository.findById(id);

  if (!reminder) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminder.user_id !== userId) {
    throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);
  }

  let newStatus: reminder_status;
  let newStatusBeforeDone: reminder_status | null = reminder.status_before_done;
  let newStatusDoneAt: Date | null = reminder.status_done_at;
  let isHealthRecord = reminder.is_health; // Default to current state

  const healthCategories: category_name[] = [
    category_name.Vaccination,
    category_name.Checkup,
    category_name.Medication,
    category_name.Deworming,
  ];

  switch (reminder.reminder_status) {
    case 'to_do':
    case 'overdue':
      newStatus = reminder_status.done;
      newStatusBeforeDone = reminder.reminder_status;
      newStatusDoneAt = new Date();
      if (healthCategories.includes(reminder.category_name)) {
        isHealthRecord = true;
      }
      break;
    case 'done':
      newStatus = reminder.status_before_done || reminder_status.to_do; // Default to 'to_do' if not set
      newStatusBeforeDone = null;
      newStatusDoneAt = null;
      isHealthRecord = false; // Revert health record status on undo
      break;
    default:
      throw new Error('Invalid reminder status');
  }

  const updateData: Prisma.remindersUpdateInput = {
    reminder_status: newStatus,
    status_before_done: newStatusBeforeDone,
    status_done_at: newStatusDoneAt,
    is_health: isHealthRecord,
  };

  return await reminderRepository.update(id, updateData);
};

export const updateOverdueReminders = async (): Promise<void> => {
  const now = new Date();

  const overdueReminders = await prisma.reminders.findMany({
    where: {
      reminder_status: 'to_do',
      reminder_date: { lte: now },
    },
  });

  const remindersToUpdate = overdueReminders.filter(r => {
    if (!r.reminder_time) {
      // date only reminder gonna compare by full day
      const reminderDay = new Date(Date.UTC(r.reminder_date.getUTCFullYear(), r.reminder_date.getUTCMonth(), r.reminder_date.getUTCDate()));
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      return reminderDay < today; // Overdue if reminder day is strictly before today
    } else {
      // with specific time, construct a GMT+7 date and convert to UTC for robust comparison
      const datePart = r.reminder_date.toISOString().split('T')[0];
      const timePart = r.reminder_time.toISOString().split('T')[1].split('.')[0];
      const isoStringWithOffset = `${datePart}T${timePart}+07:00`; // Explicitly GMT+7
      const reminderDateTime = new Date(isoStringWithOffset);
      return reminderDateTime < now; // Overdue if reminder datetime is strictly in the past
    }
  });

  if (remindersToUpdate.length > 0) {
    const idsToUpdate = remindersToUpdate.map(r => r.id);
    await reminderRepository.updateStatusForIds(idsToUpdate, reminder_status.overdue);
    console.log(`Updated ${idsToUpdate.length} reminders to overdue.`);
  }
};