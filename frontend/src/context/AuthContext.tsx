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

// Helper function to decode JWT token
const decodeJWT = (token: string): { userId: string } | null => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Failed to decode JWT:', error)
    return null
  }
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  userId: string | null
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
  const [userId, setUserId] = useState<string | null>(null)
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

      // Decode token to get userId
      const decoded = decodeJWT(response.accessToken)
      if (decoded?.userId) {
        setUserId(decoded.userId)
      }

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
      const onboardingStatus = await AsyncStorage.getItem(ONBOARDING_KEY)
      const hasSeenOnboarding = onboardingStatus === 'true'
      setHasCompletedOnboarding(hasSeenOnboarding)

      // 401 Problem
      // await apiClient.clearTokens()

      // Step 2: Check for existing token
      console.log('📝 Checking for existing token...')
      const existingToken = await apiClient.getAccessToken()
      const existingRefreshToken = await apiClient.getRefreshToken()
      console.log('Existing token:', existingToken)

      console.log('Existing refresh token:', existingRefreshToken)

      if (existingToken && existingRefreshToken) {
        console.log('✅ Using existing token')
        
        // Decode token to get userId
        const decoded = decodeJWT(existingToken)
        if (decoded?.userId) {
          setUserId(decoded.userId)
        }
        
        setToken(existingToken)
        setIsAuthenticated(true)
        setError(null)

        // Try to verify token is still valid by registering push notification
        // If this fails with 401, it will trigger token refresh or re-login
        try {
          await registerPushNotification()

          // Step 3: Check if user has pet profile (only if onboarding completed and auth successful)
          if (hasSeenOnboarding) {
            await checkPetProfile()
          }
        } catch (error: any) {
          console.warn(
            '⚠️ Token validation failed, clearing and re-authenticating...'
          )
          // Clear tokens and perform fresh device login
          await apiClient.clearTokens()
          setIsAuthenticated(false)
          setToken(null)
          await performDeviceLogin()

          // After successful re-login, check pet profile again
          if (hasSeenOnboarding) {
            await checkPetProfile()
          }
        }
      } else {
        // Step 3: Clear any partial tokens and perform device-based login
        await apiClient.clearTokens()
        await performDeviceLogin()

        // Step 4: Check if user has pet profile (only if onboarding completed)
        if (hasSeenOnboarding) {
          await checkPetProfile()
        }
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
      const [activeResponse, pastResponse] = await Promise.all([
        petProfileService.getMyPets(),
        petProfileService.getPastPets()
      ])
      const hasPets =
        (activeResponse.data && activeResponse.data.length > 0) ||
        (pastResponse.data && pastResponse.data.length > 0)
      console.log('Has pet profiles:', hasPets)
      setHasPetProfile(hasPets)
    } catch (error) {
      console.warn('⚠️ Error checking pet profiles:', error)
      setHasCompletedOnboarding(false)
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
    } catch (error: any) {
      // If token already exists (409 conflict), that's okay - it's already registered
      if (error?.statusCode === 409 || error?.response?.status === 409) {
        console.log('ℹ️ Push token already registered, skipping')
        return
      }

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
        userId,
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
