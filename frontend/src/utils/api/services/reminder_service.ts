import { IReminder } from '@/src/domain/calendar.domain'
import { apiClient } from '../api_client'

export const reminderService = {
  getReminders: async (params?: { category?: string; page?: number }) => {
    return apiClient.get<{ reminders: IReminder[]; total: number }>(
      '/reminders',
      {
        params
      }
    )
  },

  getReminderById: async (id: string) => {
    return apiClient.get<IReminder>(`/reminders/${id}`)
  },

  createReminder: async (data: Omit<IReminder, 'id'>) => {
    return apiClient.post<IReminder>('/reminders', data)
  },

  updateReminder: async (id: string, data: Partial<IReminder>) => {
    return apiClient.put<IReminder>(`/reminders/${id}`, data)
  },

  deleteReminder: async (id: string) => {
    return apiClient.delete(`/reminders/${id}`)
  }
}
