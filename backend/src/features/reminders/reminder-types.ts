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