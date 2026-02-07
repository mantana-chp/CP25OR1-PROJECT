import { reminder_status, category_name, RecurrenceFrequency } from '../../generated/prisma/client';

export interface Reminder {
  id: string;
  userId: string;
  petId: string;
  categoryName: category_name;
  reminderName?: string;
  description?: string;
  reminderDate: Date;
  reminderTime?: string;
  reminderStatus: reminder_status;
  statusDoneAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  children?: Reminder[];
}

export interface ReminderWithPetName extends Reminder {
  pet_name: string;
  children?: Reminder[]; // Children should be of the base Reminder type
}

export interface RecurrenceRule {
  id: string;
  reminderId: string;
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number;
  dayOfMonth?: number;
  reminderTime?: string;
  endDate?: Date;
  endAfterOccurrences?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FullReminderDto extends ReminderWithPetName {
  recurrence?: RecurrenceRule;
}