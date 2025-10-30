import { reminder_status } from '../../generated/prisma/enums';

export interface Reminder {
  id: string;
  userId: string;
  petId: string;
  categoryId: string;
  reminderName?: string;
  description?: string;
  reminderDate: Date;
  reminderTime?: string;
  reminderStatus: reminder_status;
  statusUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateReminderInput = {
  reminderName: string;
  description?: string;
  reminderDate: string;
  reminderTime?: string; // converted date,time value to Date in repository
};

// Internal type for creating a reminder in the repository
export type ReminderCreationData = CreateReminderInput & {
  user: { connect: { id: string } };
  pet: { connect: { id: string } };
  reminder_categories: { connect: { id: string } };
};