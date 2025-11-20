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
}

export interface ReminderWithPetName extends Reminder {
  pet_name: string;
}

export type CreateReminderInput = {
  reminderName: string;
  description?: string;
  reminderDate: string;
  reminderTime?: string; // converted date,time value to Date in repository
  categoryName?: category_name;
};

export type ReminderCreationData = CreateReminderInput & {
  user: { connect: { id: string } };
  pet: { connect: { id: string } };
};