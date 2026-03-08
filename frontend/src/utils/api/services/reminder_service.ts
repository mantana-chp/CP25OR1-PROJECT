import { IReminder } from '@/src/domain/reminder.domain'
import { apiClient } from '../api_client'

// Interface for recurring rules from backend
export interface IRecurringRule {
  id: string
  reminder_id?: string
  pet_id?: string
  pet_name?: string
  reminder_name: string
  description?: string
  category_name?: string
  recurrence_status: 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  reminder_time: string
  daysOfWeek: number | null
  dayOfMonth: number | null
  template_start_date: string
  endDate: string | null
  endAfterOccurrences: number | null
  // Array of dates (YYYY-MM-DD) that have been deleted with 'THIS_INSTANCE_ONLY'
  // These dates should be excluded from virtual reminder generation
  excluded_dates?: string[]
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
    return apiClient.patch<IReminder>(`/v1/reminders/${id}`, data)
  },

  deleteReminder: async (
    id: string,
    deleteScope?: 'THIS_INSTANCE_ONLY' | 'ALL_INSTANCES',
    excludeDate?: string // For virtual reminders: the date to exclude (YYYY-MM-DD)
  ) => {
    const params: any = {}
    if (deleteScope) {
      params.deleteScope = deleteScope
    }
    if (excludeDate) {
      params.excludeDate = excludeDate
    }
    console.log('[API DELETE Request]', {
      url: `/v1/reminders/${id}`,
      params
    })
    return apiClient.delete(`/v1/reminders/${id}`, { params })
  },

  updateReminderStatus: async (id: string) => {
    return apiClient.patch<IReminder>(`/v1/reminders/${id}/status`)
  },

  addAttachment: async (
    reminderId: string,
    attachmentData: {
      fileName: string
      fileSize: number
      fileType: string
      objectKey: string
    }
  ) => {
    return apiClient.post<{
      data: {
        id: string
        reminderId: string
        fileName: string
        fileSize: number
        fileType: string
        objectKey: string
        createdAt: string
      }
    }>(`/v1/reminders/${reminderId}/attachments`, attachmentData)
  },

  deleteAttachment: async (reminderId: string, attachmentId: string) => {
    return apiClient.delete(
      `/v1/reminders/${reminderId}/attachments/${attachmentId}`
    )
  },

  getAttachmentDownloadUrl: async (
    reminderId: string,
    attachmentId: string
  ) => {
    return apiClient.get<{ data: { downloadUrl: string; expiresIn: number } }>(
      `/v1/reminders/${reminderId}/attachments/${attachmentId}/download-url`
    )
  }
}
