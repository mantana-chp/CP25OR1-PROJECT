import { apiClient } from '@/src/utils/api/api_client'
import { authService } from '@/src/utils/api/services/auth_service'
import { petProfileService } from '@/src/utils/api/services/pet_profile_service'
import { userService } from '@/src/utils/api/services/user_service'
import { tokenRefreshEmitter } from '@/src/utils/api/token_refresh_emitter'
import { registerForPushNotificationsAsync } from '@/src/utils/registerForPushNotificationsAsync'
import AsyncStorage from '@react-native-async-storage/async-storage'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'

const ONBOARDING_KEY = '@app:hasCompletedOnboarding'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  error: string | null
  hasCompletedOnboarding: boolean
  hasPetProfile: boolean
  completeOnboarding: () => Promise<void>
  refreshAuth: () => Promise<void>
  checkPetProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false)
  const [hasPetProfile, setHasPetProfile] = useState(false)

  useEffect(() => {
    console.log('🚀 AuthProvider mounted')
    initAuth()

    // Listen for session expired events (when refresh token fails)
    const unsubscribe = tokenRefreshEmitter.onSessionExpired(async () => {
      console.log('🔄 Session expired, performing device re-login...')
      await performDeviceLogin()
    })

    return unsubscribe
  }, [])

  const performDeviceLogin = async () => {
    try {
      console.log('🔄 Performing device login...')
      const response = await authService.deviceLogin()
      console.log('Device login response:', response)

      // Save tokens and installation ID
      await apiClient.setToken(
        response.accessToken,
        response.refreshToken || ''
      )
      await apiClient.setInstallationId(response.installationId)
      console.log('✅ Tokens and installation ID saved to storage')

      setToken(response.accessToken)
      setIsAuthenticated(true)
      setError(null)

      // Register push notification token
      await registerPushNotification()

      console.log('🎉 Device login successful!')
    } catch (err: any) {
      console.error('❌ Device login failed:', err)
      setError(err?.message || 'Device login failed')
      setIsAuthenticated(false)
      setToken(null)
      throw err
    }
  }

  const initAuth = async () => {
    console.log('🔐 Starting authentication...')

    try {
      setIsLoading(true)

      // Step 1: Check onboarding status
      console.log('📱 Checking onboarding status...')
      const onboardingStatus = await AsyncStorage.getItem(ONBOARDING_KEY)
      const hasSeenOnboarding = onboardingStatus === 'true'
      console.log('Onboarding completed:', hasSeenOnboarding)
      setHasCompletedOnboarding(hasSeenOnboarding)

      // Step 2: Check for existing token
      console.log('📝 Checking for existing token...')
      const existingToken = await apiClient.getAccessToken()
      const existingRefreshToken = await apiClient.getRefreshToken()
      console.log('Existing token:', existingToken ? 'Found' : 'Not found')
      console.log('Existing token:', existingToken)
      console.log(
        'Existing refresh token:',
        existingRefreshToken ? 'Found' : 'Not found'
      )
      console.log('Existing refresh token:', existingRefreshToken)

      if (existingToken && existingRefreshToken) {
        console.log('✅ Using existing token')
        setToken(existingToken)
        setIsAuthenticated(true)
        setError(null)

        // Try to register push notification token
        // If this fails due to invalid token, the session expired event will be triggered
        try {
          await registerPushNotification()
        } catch (error) {
          console.warn('⚠️ Push notification registration failed during init')
          // Clear invalid tokens and re-login
          await apiClient.clearTokens()
          await performDeviceLogin()
        }
      } else {
        // Step 3: Clear any partial tokens and perform device-based login
        console.log('🧹 No valid token pair found, clearing tokens...')
        await apiClient.clearTokens()
        await performDeviceLogin()
      }

      // Step 4: Check if user has pet profile (only if onboarding completed)
      if (hasSeenOnboarding) {
        await checkPetProfile()
      }

      console.log('🎉 Authentication successful!')
    } catch (err: any) {
      console.error('❌ Authentication failed:', err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      setError(err?.message || 'Authentication failed')
      setIsAuthenticated(false)
      setToken(null)
    } finally {
      setIsLoading(false)
      console.log('✅ Authentication initialization complete')
    }
  }

  const checkPetProfile = async () => {
    try {
      console.log('🐾 Checking for pet profiles...')
      const response = await petProfileService.getMyPets()
      const hasPets = response.data && response.data.length > 0
      console.log('Has pet profiles:', hasPets)
      setHasPetProfile(hasPets)
    } catch (error) {
      console.warn('⚠️ Error checking pet profiles:', error)
      setHasPetProfile(false)
    }
  }

  const registerPushNotification = async () => {
    try {
      console.log('🔔 Registering push notifications...')
      const pushToken = await registerForPushNotificationsAsync()

      if (pushToken) {
        console.log('📤 Sending push token to backend:', pushToken)
        await userService.registerPushToken({
          token: pushToken,
          provider: 'expo'
        })
        console.log('✅ Push token registered successfully')
      }
    } catch (error) {
      // Don't fail authentication if push notification fails
      console.warn('⚠️ Push notification registration failed:', error)
    }
  }

  const refreshAuth = useCallback(async () => {
    console.log('🔄 Refreshing authentication...')
    await initAuth()
  }, [])

  const completeOnboarding = useCallback(async () => {
    console.log('✅ Completing onboarding...')
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
      setHasCompletedOnboarding(true)
      await checkPetProfile()
      console.log('🎉 Onboarding completed!')
    } catch (error) {
      console.error('❌ Error saving onboarding status:', error)
    }
  }, [])

  console.log('Auth State:', {
    isLoading,
    isAuthenticated,
    hasToken: !!token,
    hasCompletedOnboarding,
    error
  })

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        token,
        error,
        hasCompletedOnboarding,
        hasPetProfile,
        completeOnboarding,
        refreshAuth,
        checkPetProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
