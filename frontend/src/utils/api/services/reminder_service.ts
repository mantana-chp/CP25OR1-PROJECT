import { IReminder } from '@/src/domain/reminder.domain'
import { apiClient } from '../api_client'

export const reminderService = {
  getReminders: async (params?: { category?: string; page?: number }) => {
    return apiClient.get<{ data: IReminder[]; total: number }>(
      '/v1/reminders',
      {
        params,
      }
    )
  },

  getReminderById: async (id: string) => {
    return apiClient.get<IReminder>(`/v1/reminders/${id}`)
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

  updateReminderStatus: async (id: string, data: Partial<IReminder>) => {
    return apiClient.patch<IReminder>(`/v1/reminders/${id}/status`, data)
  },
}
