import { DeviceLoginResponse } from '@/src/domain/auth.domain'
import {
  DeviceIdentifiers,
  deviceIdService
} from '../../devices/deviceIdService'
import { apiClient } from '../api_client'

export const authService = {
  deviceLogin: async (): Promise<
    DeviceLoginResponse & { installationId: string }
  > => {
    const deviceIdentifiers = await deviceIdService.getDeviceIdentifiers()

    const response = await apiClient.post<{ data: DeviceLoginResponse }>(
      '/v1/auth/device-login',
      {
        installationId: deviceIdentifiers.installationId,
        platform: deviceIdentifiers.platform,
        platformDeviceId: deviceIdentifiers.platformDeviceId,
        platformIdSource: deviceIdentifiers.platformIdSource
      }
    )

    return {
      ...response.data,
      installationId: deviceIdentifiers.installationId
    }
  },

  refreshToken: async (refreshToken: string): Promise<DeviceLoginResponse> => {
    await deviceIdService.getDeviceIdentifiers()

    const response = await apiClient.post<{ data: DeviceLoginResponse }>(
      '/v1/auth/refresh',
      {
        refreshToken
      }
    )

    return response.data
  },

  getDeviceIdentifiers: async (): Promise<DeviceIdentifiers> => {
    return deviceIdService.getDeviceIdentifiers()
  }
}
