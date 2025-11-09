import { apiClient } from '@/src/utils/api/api_client'
import { authService } from '@/src/utils/api/services/auth_service'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  error: string | null
  refreshAuth: () => Promise<void>
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

  useEffect(() => {
    console.log('🚀 AuthProvider mounted')
    initAuth()
  }, [])

  const initAuth = async () => {
    console.log('🔐 Starting authentication...')

    try {
      setIsLoading(true)

      // Step 1: Check for existing token
      console.log('📝 Checking for existing token...')
      const existingToken = await apiClient.getAccessToken()
      console.log('Existing token:', existingToken ? 'Found' : 'Not found')

      if (existingToken) {
        console.log('✅ Using existing token')
        setToken(existingToken)
        setIsAuthenticated(true)
        setError(null)
      } else {
        // Step 2: Perform device-based login
        console.log('🔄 Performing device login...')
        const response = await authService.deviceLogin()
        console.log('Device login response:', response)

        // Step 3: Save tokens
        await apiClient.setToken(
          response.accessToken,
          response.refreshToken || ''
        )
        console.log('✅ Tokens saved to storage')

        setToken(response.accessToken)
        setIsAuthenticated(true)
        setError(null)
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

  const refreshAuth = useCallback(async () => {
    console.log('🔄 Refreshing authentication...')
    await initAuth()
  }, [])

  console.log('Auth State:', {
    isLoading,
    isAuthenticated,
    hasToken: !!token,
    error
  })

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        token,
        error,
        refreshAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
