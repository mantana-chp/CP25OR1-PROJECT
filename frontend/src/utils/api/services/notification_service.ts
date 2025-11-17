import { INotification } from '@/src/domain/notification.domain'
import { apiClient } from '../api_client'

export const notificationService = {
  getNotifications: async () => {
    return apiClient.get<{ data: INotification[] }>('/v1/notifications')
  },

  updateNotificationStatus: async (id: string, payload: { read: boolean }) => {
    return apiClient.patch<{ data: INotification }>(
      `/v1/notifications/${id}`,
      payload
    )
  },
}
