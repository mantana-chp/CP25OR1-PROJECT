import * as reminderRepository from './reminder-repository';
import { Reminder, CreateReminderInput, ReminderCreationData } from './reminder-types';
import { mapPrismaReminderToReminder } from './reminder-mapper';
import { NotFoundError, ApiError, BadRequestError, ConflictError } from '../../shared/errors';
import { reminder_status } from '../../generated/prisma/client';

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
  const petId = "ddd11111-1111-1111-1111-111111111111"; // hardcoded for sprint 1
  const categoryId = "ccc11111-1111-1111-1111-111111111111"; // hardcoded for sprint 1

  const reminderDate = new Date(newReminderData.reminderDate);
  const reminderTime = newReminderData.reminderTime ? new Date(`2000-01-01T${newReminderData.reminderTime}Z`) : null;

  const existingReminder = await reminderRepository.findByUniqueFields(
    petId,
    newReminderData.reminderName,
    reminderDate,
    reminderTime
  );

  if (existingReminder) {
    throw new ConflictError('Conflict', [
      { message: 'A reminder with the same name, date, and time already exists for this pet.', code: 409 },
    ]);
  }

  const dataForRepo: ReminderCreationData = {
    ...newReminderData,
    user: { connect: { id: userId } },
    pet: { connect: { id: petId } },
    reminder_categories: { connect: { id: categoryId } },
  };
  return await reminderRepository.add(dataForRepo);
};