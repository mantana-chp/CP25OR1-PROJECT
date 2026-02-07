import { IReminder } from '@/src/domain/reminder.domain'
import { apiClient } from '../api_client'

// Interface for recurring rules from backend
export interface IRecurringRule {
  id: string
  reminder_id: string
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  reminder_time: string
  daysOfWeek: number | null
  dayOfMonth: number | null
  endDate: string | null
  endAfterOccurrences: number | null
  created_at: string
  updated_at: string
}

// Response type for getReminders with new structure
export interface GetRemindersResponse {
  data: {
    reminders: IReminder[]
    recurringRules: IRecurringRule[]
  }
}

export const reminderService = {
  getReminders: async (params?: { category?: string; page?: number }) => {
    return apiClient.get<GetRemindersResponse>('/v1/reminders', {
      params
    })
  },

  getReminderById: async (id: string) => {
    return apiClient.get<{ data: IReminder }>(`/v1/reminders/${id}`)
  },

  createReminder: async (data: Omit<IReminder, 'id'>) => {
    return apiClient.post<IReminder>('/v1/reminders', data)
  },

  updateReminder: async (id: string, data: Partial<IReminder>) => {
    return apiClient.put<IReminder>(`/v1/reminders/${id}`, data)
  },

  deleteReminder: async (id: string) => {
    return apiClient.delete(`/v1/reminders/${id}`)
  },

  updateReminderStatus: async (id: string) => {
    return apiClient.patch<IReminder>(`/v1/reminders/${id}/status`)
  }
}
