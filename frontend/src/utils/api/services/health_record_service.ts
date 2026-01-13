import { IReminder } from '@/src/domain/reminder.domain'
import { apiClient } from '../api_client'

export const healthRecordService = {
  getHealthRecords: async (params?: { category?: string; page?: number }) => {
    return apiClient.get<{ data: IReminder[]; total: number }>(
      '/v1/health-records',
      {
        params,
      }
    )
  },
}
