export interface IReminder {
  id: number
  title: string
  location: string
  reminderDate: string
  time: string
  status: 'todo' | 'done'
}
