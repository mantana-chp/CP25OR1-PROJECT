import { apiClient } from '@/src/utils/api/api_client'
import { authService } from '@/src/utils/api/services/auth_service'
import React, { createContext, useContext, useEffect, useState } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  token: string | null
  error: string | null
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  token: null,
  error: null
})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initAuth()
  }, [])

  const initAuth = async () => {
    console.log('เข้านี่นะ');
    
    try {
      console.log('🔐 Fetching authentication token...')

      // Check if token already exists
      const existingToken = await apiClient.getToken()

      if (existingToken) {
        console.log('✅ Token found in storage')
        setToken(existingToken)
        setIsAuthenticated(true)
      } else {
        console.log('🔄 Fetching new token from server...')

        // Fetch new token from backend
        const response = await authService.fetchToken({
          installationId: 'unique-installation-id',
          platform: 'ios',
          platformDeviceId: 'unique-device-id',
          platformIdSource: 'ios_keychain'
        })

        // Save token
        await apiClient.setToken(response.accessToken)

        console.log('✅ Token fetched and saved')
        setToken(response.accessToken)
        setIsAuthenticated(true)
      }

      setError(null)
    } catch (err) {
      console.error('❌ Auth initialization failed:', err)
      setError('Failed to authenticate')
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        token,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
