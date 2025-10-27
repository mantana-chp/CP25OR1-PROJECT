import * as reminderRepository from './reminder-repository';
import { Reminder } from './reminder-types';
import { REMINDER_STATUS } from '../../shared/constants';

export const getAllReminders = (): Reminder[] => {
  return reminderRepository.findAll();
};

export const createNewReminder = (newReminderData: Omit<Reminder, 'id' | 'status'>): Reminder => {
  // Duplicate check (business logic: same pet, same date, same title)
  const isDuplicate = reminderRepository.findAll().some(
    (r) =>
      r.petId === newReminderData.petId &&
      r.date === newReminderData.date &&
      r.title === newReminderData.title
  );

  if (isDuplicate) {
    throw new Error("Duplicate reminder: A reminder with the same pet, date, and title already exists.");
  }

  // Generate ID (business logic, but can be delegated to repo for mock data)
  const id = (reminderRepository.getReminderCount() + 1).toString();

  // Prepare reminder data with default status (business logic)
  const reminderToCreate: Reminder = {
    ...newReminderData,
    id,
    status: REMINDER_STATUS.TO_DO,
  };

  return reminderRepository.add(reminderToCreate);
};