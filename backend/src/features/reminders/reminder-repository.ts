import mockRemindersData from './reminder-mock-data.json';
import { Reminder } from './reminder-types';

const mockReminders: Reminder[] = [...(mockRemindersData as Reminder[])];

export const findAll = (): Reminder[] => {
  return mockReminders;
};

export const getReminderCount = (): number => {
  return mockReminders.length;
};

export const add = (newReminder: Reminder): Reminder => {
  // add new reminder from service
  mockReminders.push(newReminder);
  return newReminder;
};