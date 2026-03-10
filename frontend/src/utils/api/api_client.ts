import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { tokenRefreshEmitter } from './token_refresh_emitter'

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL
const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const INSTALLATION_ID_KEY = 'installationId'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: any,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key)
      } else {
        return await SecureStore.getItemAsync(key)
      }
    } catch (error) {
      console.error(`Error getting item ${key}:`, error)
      return null
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value)
      } else {
        await SecureStore.setItemAsync(key, value)
      }
    } catch (error) {
      console.error(`Error setting item ${key}:`, error)
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key)
      } else {
        await SecureStore.deleteItemAsync(key)
      }
    } catch (error) {
      console.error(`Error removing item ${key}:`, error)
    }
  },
}

class ApiClient {
  private client: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: any) => void
    reject: (reason?: any) => void
  }> = []

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('✅ API Client initialized:', API_BASE_URL)
    this.setupInterceptors()
  }

  private processQueue(error: any = null, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error)
      } else {
        prom.resolve(token)
      }
    })

    this.failedQueue = []
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const accessToken = await storage.getItem(ACCESS_TOKEN_KEY)
          const installationId = await storage.getItem(INSTALLATION_ID_KEY)

          if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`
          }
          if (installationId) {
            config.headers['X-Installation-Id'] = installationId
          }

          console.log('📤 Request:', config.method?.toUpperCase(), config.url)
          return config
        } catch (error) {
          console.error('❌ Error getting token:', error)
        }

        return config
      },
      (error) => {
        console.error('❌ Request error:', error)
        return Promise.reject(error)
      },
    )

    this.client.interceptors.response.use(
      (response) => {
        console.log('✅ Response:', response.status, response.config.url)
        return response
      },
      async (error: AxiosError) => {
        const originalRequest: any = error.config

        console.error('❌ Response error 111:', error.message)

        if (error.response) {
          console.log('ERRORRRR')

          const { status, data } = error.response
          console.error('Status:', status, 'Data:', data)

          // Handle 401 - Token refresh logic
          if (status === 401 && !originalRequest._retry) {
            if (this.isRefreshing) {
              // If already refreshing, queue this request
              return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject })
              })
                .then((token) => {
                  originalRequest.headers.Authorization = `Bearer ${token}`
                  return this.client(originalRequest)
                })
                .catch((err) => {
                  return Promise.reject(err)
                })
            }

            originalRequest._retry = true
            this.isRefreshing = true

            // Emit event to show loading overlay
            tokenRefreshEmitter.emit(true)

            try {
              console.log('🔄 Attempting token refresh...')
              const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY)

              if (!refreshToken) {
                throw new Error('No refresh token available')
              }

              // Call refresh token endpoint
              const response = await this.client.post<{
                data: { accessToken: string; refreshToken: string }
              }>('/v1/auth/refresh', {
                refreshToken,
              })

              const { accessToken, refreshToken: newRefreshToken } =
                response.data.data

              // Save new tokens
              await storage.setItem(ACCESS_TOKEN_KEY, accessToken)
              await storage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)

              console.log('✅ Token refreshed successfully')

              // Update authorization header
              originalRequest.headers.Authorization = `Bearer ${accessToken}`

              // Process queued requests
              this.processQueue(null, accessToken)

              // Retry original request
              return this.client(originalRequest)
            } catch (refreshError) {
              console.error('❌ Token refresh failed:', refreshError)

              // Clear tokens on refresh failure
              await storage.removeItem(ACCESS_TOKEN_KEY)
              await storage.removeItem(REFRESH_TOKEN_KEY)

              // Process queued requests with error
              this.processQueue(refreshError, null)

              // Emit session expired event to trigger device re-login
              tokenRefreshEmitter.emitSessionExpired()

              // Throw error to trigger re-login
              throw new ApiError(401, 'เซสชันหมดอายุ โปรดเข้าสู่ระบบอีกครั้ง')
            } finally {
              this.isRefreshing = false
              // Hide loading overlay
              tokenRefreshEmitter.emit(false)
            }
          }

          // For any other 401 errors (non-retryable), also clear tokens
          if (status === 401) {
            console.log('🗑️ Clearing tokens due to 401 error')
            await storage.removeItem(ACCESS_TOKEN_KEY)
            await storage.removeItem(REFRESH_TOKEN_KEY)
            throw new ApiError(401, 'เซสชันหมดอายุ โปรดเข้าสู่ระบบอีกครั้ง')
          }

          switch (status) {
            case 403:
              throw new ApiError(403, 'คุณไม่มีสิทธิ์ในการดำเนินการนี้')

            case 404:
              throw new ApiError(404, 'ไม่พบทรัพยากร')

            case 422:
              throw new ApiError(
                422,
                'การตรวจสอบล้มเหลว',
                (data as any)?.errors,
              )

            case 500:
              throw new ApiError(
                500,
                'เกิดข้อผิดพลาดของเซิร์ฟเวอร์ โปรดลองอีกครั้ง',
              )

            default:
              throw new ApiError(
                status,
                (data as any)?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด',
              )
          }
        } else if (error.request) {
          console.error('❌ Network error - no response received')
          throw new ApiError(
            0,
            'ข้อผิดพลาดของเครือข่าย โปรดตรวจสอบการเชื่อมต่อของคุณ',
          )
        } else {
          throw new ApiError(0, error.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด')
        }
      },
    )
  }

  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config)
    return response.data
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url })
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data })
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data })
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data })
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url })
  }

  // Auth helpers
  async setToken(accessToken: string, refreshToken: string): Promise<void> {
    await storage.setItem(ACCESS_TOKEN_KEY, accessToken)
    await storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    console.log('✅ Tokens saved')
  }

  async getAccessToken(): Promise<string | null> {
    return await storage.getItem(ACCESS_TOKEN_KEY)
  }

  async getRefreshToken(): Promise<string | null> {
    return await storage.getItem(REFRESH_TOKEN_KEY)
  }

  async clearTokens(): Promise<void> {
    await storage.removeItem(ACCESS_TOKEN_KEY)
    await storage.removeItem(REFRESH_TOKEN_KEY)
    console.log('✅ Tokens cleared')
  }

  // ⬇️ เพิ่ม Helper สำหรับ InstallationId
  async setInstallationId(id: string): Promise<void> {
    await storage.setItem(INSTALLATION_ID_KEY, id)
  }
}

export const apiClient = new ApiClient()
