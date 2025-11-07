import Constants from 'expo-constants'
import * as Device from 'expo-device'
import { apiClient } from '../api_client'

export interface AuthResponse {
  accessToken: string
  expiresIn?: number
  refreshToken?: string
}

export interface DeviceInfo {
  deviceId: string
  deviceName: string
  platform: string
  appVersion: string
}

// Get device information
const getDeviceInfo = (): DeviceInfo => {
  return {
    deviceId: Constants.sessionId || 'unknown',
    deviceName: Device.deviceName || 'unknown',
    platform: Device.osName || 'unknown',
    appVersion: Constants.expoConfig?.version || '1.0.0'
  }
}

export const authService = {
  /**
   * Fetch authentication token from backend
   * This is called automatically when app loads
   */
  fetchToken: async (): Promise<AuthResponse> => {
    const deviceInfo = getDeviceInfo()

    console.log('📱 Device Info:', deviceInfo)

    return apiClient.post<AuthResponse>('/auth/token', {
      ...deviceInfo,
      timestamp: new Date().toISOString()
    })
  },

  /**
   * Refresh existing token
   * Call this periodically to keep token fresh
   */
  refreshToken: async (): Promise<AuthResponse> => {
    return apiClient.post<AuthResponse>('/auth/refresh')
  },

  /**
   * Validate if current token is still valid
   */
  validateToken: async (): Promise<boolean> => {
    try {
      await apiClient.get('/auth/validate')
      return true
    } catch (error) {
      return false
    }
  }
}
