import * as reminderRepository from './reminder-repository';
import { Reminder, CreateReminderInput } from './reminder-types';
import { mapPrismaReminderToReminder } from './reminder-mapper';
import { NotFoundError, ApiError, BadRequestError, ConflictError } from '../../shared/errors';
import { Prisma, reminder_status } from '../../generated/prisma/client';
import prisma from '../../libs/db';

export const getAllReminders = async (userId: string): Promise<Reminder[]> => {
  return await reminderRepository.findAllByUserId(userId);
};

export const getReminderById = async (id: string, userId: string): Promise<Reminder> => {
  const reminder = await reminderRepository.findById(id);

  if (!reminder) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminder.user_id !== userId) {
    throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);
  }

  return mapPrismaReminderToReminder(reminder);
};

export const deleteReminder = async (id: string, userId: string): Promise<void> => {
  const reminder = await reminderRepository.findById(id);

  if (!reminder) {
    throw new NotFoundError('Reminder not found');
  }

  if (reminder.user_id !== userId) {
    throw new ApiError('Forbidden', 403, [{ message: 'User is not the owner of this reminder', code: 403 }]);
  }

  if (reminder.reminder_status !== reminder_status.to_do) {
    if (reminder.reminder_status === reminder_status.done) {
      throw new BadRequestError('Reminders with status "Done" cannot be deleted.');
    } else {
      throw new BadRequestError('Only "To Do" reminders are deletable.');
    }
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

  const categoryId = "ccc11111-1111-1111-1111-111111111111"; // hardcoded for sprint 1

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
    user: { connect: { id: userId } },
    pets: { connect: { id: pet.id } },
    reminder_categories: { connect: { id: categoryId } },
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

  switch (reminder.reminder_status) {
    case 'to_do':
      newStatus = reminder_status.done;
      newStatusBeforeDone = reminder_status.to_do;
      newStatusDoneAt = new Date();
      break;
    case 'overdue':
      newStatus = reminder_status.done;
      newStatusBeforeDone = reminder_status.overdue;
      newStatusDoneAt = new Date();
      break;
    case 'done':
      newStatus = reminder.status_before_done || reminder_status.to_do; // Default to 'to_do' if not set
      newStatusBeforeDone = null;
      newStatusDoneAt = null;
      break;
    default:
      // Should not be reachable
      throw new Error('Invalid reminder status');
  }

  const updateData: Prisma.remindersUpdateInput = {
    reminder_status: newStatus,
    status_before_done: newStatusBeforeDone,
    status_done_at: newStatusDoneAt,
  };

  return await reminderRepository.update(id, updateData);
};