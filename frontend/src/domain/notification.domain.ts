import { IReminder } from '@/src/domain/reminder.domain'

export interface INotification {
  id: string
  user_id: string
  reminder_id: string
  sent_at: string | null
  status: string
  read_at: string | null
  created_at: string
  reminder: IReminder
}
