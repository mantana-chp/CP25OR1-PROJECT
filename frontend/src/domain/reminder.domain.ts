export interface IReminder {
  id: string;
  userId: string;
  petId: string;
  petName: string;
  categoryId: string;
  reminderName: string;
  description: string;
  reminderDate: string;
  reminderTime: string;
  reminderStatus: 'to_do' | 'done' | 'overdue';
  statusUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}
