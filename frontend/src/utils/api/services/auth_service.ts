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

    const requestPayload = {
      installationId: deviceIdentifiers.installationId,
      platform: deviceIdentifiers.platform,
      platformDeviceId: deviceIdentifiers.platformDeviceId,
      platformIdSource: deviceIdentifiers.platformIdSource
    }

    console.log('🚀 [Auth] Device login request payload:', requestPayload)

    try {
      const response = await apiClient.post<{ data: DeviceLoginResponse }>(
        '/v1/auth/device-login',
        requestPayload
      )

      return {
        ...response.data,
        installationId: deviceIdentifiers.installationId
      }
    } catch (error: any) {
      console.error('❌ [Auth] Device login failed:', {
        status: error.response?.status,
        data: error.response?.data,
        requestPayload
      })
      throw error
    }
  },

  getDeviceIdentifiers: async (): Promise<DeviceIdentifiers> => {
    return deviceIdService.getDeviceIdentifiers()
  }
}
