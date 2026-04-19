import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Application from 'expo-application'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4, v5 as uuidv5 } from 'uuid'

const INSTALLATION_ID_KEY = '@app:installationId'
const ANDROID_SSAID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

export interface DeviceIdentifiers {
  installationId: string // Unique per app installation (UUID)
  platform: 'ios' | 'android' // Platform type
  platformDeviceId: string // Device-specific ID
  platformIdSource: 'ios_keychain' | 'android_ssaid' // Where the device ID came from
}

/**
 * Service for managing device identifiers
 * Used for device-based authentication
 */
class DeviceIdService {
  /**
   * Get or create installation ID
   * This ID is unique per app installation and persists across app restarts
   */
  private async getInstallationId(): Promise<string> {
    try {
      let installationId = await AsyncStorage.getItem(INSTALLATION_ID_KEY)

      if (!installationId) {
        installationId = uuidv4()
        await AsyncStorage.setItem(INSTALLATION_ID_KEY, installationId)
      }

      return installationId
    } catch (error) {
      console.error('❌ [DeviceId] Error getting installation ID:', error)

      return uuidv4()
    }
  }

  /**
   * Get platform-specific device identifier
   */
  private async getPlatformDeviceId(): Promise<{
    deviceId: string
    source: 'ios_keychain' | 'android_ssaid'
  }> {
    const platform = Platform.OS

    try {
      if (platform === 'ios') {
        const iosId = await Application.getIosIdForVendorAsync()
        if (iosId) {
          return { deviceId: iosId, source: 'ios_keychain' }
        }

        const fallbackId = uuidv4()

        return { deviceId: fallbackId, source: 'ios_keychain' }
      } else if (platform === 'android') {
        const androidId = await Application.getAndroidId()

        if (androidId) {
          // Backend requires UUID format, so derive a deterministic UUID from Android ID.
          const derivedDeviceId = uuidv5(androidId, ANDROID_SSAID_NAMESPACE)
          return { deviceId: derivedDeviceId, source: 'android_ssaid' }
        }

        console.warn(
          '⚠️ [DeviceId] Android ID unavailable, falling back to installation ID'
        )
        const installationId = await this.getInstallationId()
        return { deviceId: installationId, source: 'android_ssaid' }
      } else {
        console.warn(
          '⚠️ [DeviceId] Platform not supported by backend, defaulting to android'
        )
        const fallbackId = uuidv4()
        return { deviceId: fallbackId, source: 'android_ssaid' }
      }
    } catch (error) {
      console.error('❌ [DeviceId] Error getting platform device ID:', error)

      const fallbackId = uuidv4()
      const source = platform === 'ios' ? 'ios_keychain' : 'android_ssaid'
      return { deviceId: fallbackId, source }
    }
  }

  /**
   * Get all device identifiers needed for authentication
   */
  async getDeviceIdentifiers(): Promise<DeviceIdentifiers> {
    console.log('🔍 [DeviceId] Getting device identifiers...')

    const [installationId, platformInfo] = await Promise.all([
      this.getInstallationId(),
      this.getPlatformDeviceId()
    ])

    const platform: 'ios' | 'android' =
      Platform.OS === 'ios' ? 'ios' : 'android'

    const identifiers: DeviceIdentifiers = {
      installationId,
      platform,
      platformDeviceId: platformInfo.deviceId,
      platformIdSource: platformInfo.source
    }

    console.log('✅ [DeviceId] Device identifiers:', {
      installationId: identifiers.installationId.substring(0, 8) + '...',
      platform: identifiers.platform,
      platformDeviceId: identifiers.platformDeviceId, // Show full ID for debugging
      platformIdSource: identifiers.platformIdSource
    })

    console.log('📤 [DeviceId] Will send to backend:', {
      installationId: identifiers.installationId,
      platform: identifiers.platform,
      platformDeviceId: identifiers.platformDeviceId,
      platformIdSource: identifiers.platformIdSource
    })

    return identifiers
  }

  async getDeviceInfo() {
    return {
      brand: Device.brand,
      manufacturer: Device.manufacturer,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      deviceName: Device.deviceName,
      platform: Platform.OS,
      platformVersion: Platform.Version
    }
  }

  async clearInstallationId(): Promise<void> {
    try {
      await AsyncStorage.removeItem(INSTALLATION_ID_KEY)
      console.log('🗑️ [DeviceId] Installation ID cleared')
    } catch (error) {
      console.error('❌ [DeviceId] Error clearing installation ID:', error)
    }
  }
}

export const deviceIdService = new DeviceIdService()
