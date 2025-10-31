export interface IReminder {
  id: number
  title: string
  pet_name: string
  reminderDate: string
  time: string
  status: 'todo' | 'done'
}
