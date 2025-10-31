export interface IReminder {
  id: string;
  title: string;
  pet_name: string;
  reminderDate: string;
  time: string;
  status: 'todo' | 'done';
}
