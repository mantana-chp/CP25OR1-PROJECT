import { reminder_status, category_name } from '../../generated/prisma/client';

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

export type CreateReminderInput = {
  reminderName: string;
  description?: string;
  reminderDate: string;
  reminderTime?: string; // converted date,time value to Date in repository
  categoryName?: category_name;
  parentId?: string; // Add parentId for creating child reminders
};

export type ReminderCreationData = CreateReminderInput & {
  user: { connect: { id: string } };
  pet: { connect: { id: string } };
};