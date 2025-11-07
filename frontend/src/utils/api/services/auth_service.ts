import { apiClient } from '../api_client'

export interface DeviceLoginParams {
  installationId: string
  platform: 'ios' | 'android' | 'other'
  platformDeviceId: string
  platformIdSource: 'ios_keychain' | 'android_ssaid' | 'unknown'
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
}

export const authService = {
  fetchToken: async (params: DeviceLoginParams): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/v1/auth/device-login', params)
  },
  // deviceLogin: async (params: DeviceLoginParams) => {
  //   return apiClient.post<AuthResponse>('/v1/auth/device-login', params)
  // },

  refresh: async (refreshToken: string, installationId: string) => {
    return apiClient.post<AuthResponse>(
      '/v1/auth/refresh',
      {
        refreshToken
      },
      {
        headers: {
          'X-Installation-Id': installationId
        }
      }
    )
  }
}
