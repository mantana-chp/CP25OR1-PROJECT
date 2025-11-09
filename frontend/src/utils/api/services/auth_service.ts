import { DeviceLoginResponse } from '@/src/domain/auth.domain'
import {
  DeviceIdentifiers,
  deviceIdService
} from '../../devices/deviceIdService'
import { apiClient } from '../api_client'

export const authService = {
  /**
   * Device-based login/registration
   * Automatically creates account if device is new
   */
  deviceLogin: async (): Promise<
    DeviceLoginResponse & { installationId: string }
  > => {
    const deviceIdentifiers = await deviceIdService.getDeviceIdentifiers()

    console.log('📱 [Auth] Device Login with:', {
      installationId: deviceIdentifiers.installationId.substring(0, 8) + '...',
      platform: deviceIdentifiers.platform,
      platformIdSource: deviceIdentifiers.platformIdSource
    })

    // Send request matching backend API format exactly
    const response = await apiClient.post<{ data: DeviceLoginResponse }>(
      '/v1/auth/device-login',
      {
        installationId: deviceIdentifiers.installationId,
        platform: deviceIdentifiers.platform,
        platformDeviceId: deviceIdentifiers.platformDeviceId,
        platformIdSource: deviceIdentifiers.platformIdSource
      }
    )

    console.log('✅ [Auth] Device login successful')
    // Extract nested data from response and include installationId
    return {
      ...response.data,
      installationId: deviceIdentifiers.installationId
    }
  },

  /**
   * Refresh access token using refresh token
   * Headers should include X-Installation-Id
   */
  refreshToken: async (refreshToken: string): Promise<DeviceLoginResponse> => {
    const deviceIdentifiers = await deviceIdService.getDeviceIdentifiers()

    console.log(
      '🔄 [Auth] Refreshing token for installation:',
      deviceIdentifiers.installationId.substring(0, 8) + '...'
    )

    // The apiClient should add X-Installation-Id header automatically
    const response = await apiClient.post<{ data: DeviceLoginResponse }>(
      '/v1/auth/refresh',
      {
        refreshToken
      }
    )

    console.log('✅ [Auth] Token refreshed successfully')
    // Extract nested data from response
    return response.data
  },

  /**
   * Get current device identifiers (for debugging)
   */
  getDeviceIdentifiers: async (): Promise<DeviceIdentifiers> => {
    return deviceIdService.getDeviceIdentifiers()
  }
}
