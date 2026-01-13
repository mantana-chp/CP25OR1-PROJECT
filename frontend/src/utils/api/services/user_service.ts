import { apiClient } from '../api_client'

export interface IPushTokenRequest {
  token: string
  provider: 'expo'
}

export interface IPushTokenResponse {
  status: {
    code: string
    description: string
  }
  data: {
    userId: string
    token: string
    provider: string
  }
}

export const userService = {
  /**
   * Register push notification token for the authenticated user
   */
  registerPushToken: async (data: IPushTokenRequest) => {
    return apiClient.post<IPushTokenResponse>('/v1/users/me/push-token', data)
  }
}
