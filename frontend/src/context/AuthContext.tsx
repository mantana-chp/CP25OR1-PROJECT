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
  checkPetProfile: () => Promise<boolean>
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
    initAuth()

    const unsubscribe = tokenRefreshEmitter.onSessionExpired(async () => {
      await performDeviceLogin()
    })

    return unsubscribe
  }, [])

  const performDeviceLogin = async () => {
    try {
      const response = await authService.deviceLogin()

      await apiClient.setToken(
        response.accessToken,
        response.refreshToken || ''
      )
      await apiClient.setInstallationId(response.installationId)

      const decoded = decodeJWT(response.accessToken)
      if (decoded?.userId) {
        setUserId(decoded.userId)
      }

      setToken(response.accessToken)
      setIsAuthenticated(true)
      setError(null)

      await registerPushNotification()

    } catch (err: any) {
      setError(err?.message || 'Device login failed')
      setIsAuthenticated(false)
      setToken(null)
      throw err
    }
  }

  const reconcileOnboardingState = async (
    localOnboardingCompleted: boolean
  ) => {
    const hasPets = await checkPetProfile()

    if (hasPets && !localOnboardingCompleted) {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
      setHasCompletedOnboarding(true)
    }
  }

  const initAuth = async () => {

    try {
      setIsLoading(true)

      const onboardingStatus = await AsyncStorage.getItem(ONBOARDING_KEY)
      const hasSeenOnboarding = onboardingStatus === 'true'
      setHasCompletedOnboarding(hasSeenOnboarding)


      const existingToken = await apiClient.getAccessToken()
      const existingRefreshToken = await apiClient.getRefreshToken()


      if (existingToken && existingRefreshToken) {

        const decoded = decodeJWT(existingToken)
        if (decoded?.userId) {
          setUserId(decoded.userId)
        }

        setToken(existingToken)
        setIsAuthenticated(true)
        setError(null)

        try {
          await registerPushNotification()

          await reconcileOnboardingState(hasSeenOnboarding)
        } catch {
          await apiClient.clearTokens()
          setIsAuthenticated(false)
          setToken(null)
          await performDeviceLogin()

          await reconcileOnboardingState(hasSeenOnboarding)
        }
      } else {
        await apiClient.clearTokens()
        await performDeviceLogin()

        await reconcileOnboardingState(hasSeenOnboarding)
      }

    } catch (err: any) {
      setError(err?.message || 'Authentication failed')
      setIsAuthenticated(false)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  const checkPetProfile = async (): Promise<boolean> => {
    try {
      const [activeResponse, pastResponse] = await Promise.all([
        petProfileService.getMyPets(),
        petProfileService.getPastPets()
      ])
      const hasPets =
        (activeResponse.data && activeResponse.data.length > 0) ||
        (pastResponse.data && pastResponse.data.length > 0)
      setHasPetProfile(hasPets)
      return hasPets
    } catch (error) {
      setHasPetProfile(false)
      return false
    }
  }

  const registerPushNotification = async () => {
    try {
      const pushToken = await registerForPushNotificationsAsync()

      if (pushToken) {
        await userService.registerPushToken({
          token: pushToken,
          provider: 'expo'
        })
      }
    } catch (error: any) {
      if (error?.statusCode === 409 || error?.response?.status === 409) {
        return
      }

    }
  }

  const refreshAuth = useCallback(async () => {
    await initAuth()
  }, [])

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
      setHasCompletedOnboarding(true)
      await checkPetProfile()
    } catch (error) {
    }
  }, [])


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
