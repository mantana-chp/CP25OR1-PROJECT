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

  private extractApiErrorMessage(data: any, fallback: string): string {
    if (!data || typeof data !== 'object') {
      return fallback
    }

    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message.trim()
    }

    const firstErrorMessage = data.errors?.[0]?.message
    if (typeof firstErrorMessage === 'string' && firstErrorMessage.trim()) {
      return firstErrorMessage.trim()
    }

    return fallback
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

          return config
        } catch (error) {
        }

        return config
      },
      (error) => {
        return Promise.reject(error)
      },
    )

    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      async (error: AxiosError) => {
        const originalRequest: any = error.config


        if (error.response) {

          const { status, data } = error.response
          const errorMessage = this.extractApiErrorMessage(
            data,
            'เกิดข้อผิดพลาดที่ไม่คาดคิด',
          )
          const errorDetails = (data as any)?.errors

          if (status === 401 && !originalRequest._retry) {
            if (this.isRefreshing) {
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

            tokenRefreshEmitter.emit(true)

            try {
              const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY)

              if (!refreshToken) {
                throw new Error('No refresh token available')
              }

              const response = await this.client.post<{
                data: { accessToken: string; refreshToken: string }
              }>('/v1/auth/refresh', {
                refreshToken,
              })

              const { accessToken, refreshToken: newRefreshToken } =
                response.data.data

              await storage.setItem(ACCESS_TOKEN_KEY, accessToken)
              await storage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)


              originalRequest.headers.Authorization = `Bearer ${accessToken}`

              this.processQueue(null, accessToken)

              return this.client(originalRequest)
            } catch (refreshError) {

              await storage.removeItem(ACCESS_TOKEN_KEY)
              await storage.removeItem(REFRESH_TOKEN_KEY)

              this.processQueue(refreshError, null)

              tokenRefreshEmitter.emitSessionExpired()

              throw new ApiError(401, 'เซสชันหมดอายุ โปรดเข้าสู่ระบบอีกครั้ง')
            } finally {
              this.isRefreshing = false
              tokenRefreshEmitter.emit(false)
            }
          }

          if (status === 401) {
            await storage.removeItem(ACCESS_TOKEN_KEY)
            await storage.removeItem(REFRESH_TOKEN_KEY)
            throw new ApiError(401, 'เซสชันหมดอายุ โปรดเข้าสู่ระบบอีกครั้ง')
          }

          switch (status) {
            case 400:
              throw new ApiError(400, errorMessage, errorDetails)

            case 409:
              throw new ApiError(
                409,
                (data as any)?.data?.message || errorMessage,
                (data as any)?.data || errorDetails,
              )

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
              throw new ApiError(status, errorMessage, errorDetails)
          }
        } else if (error.request) {
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

  async setToken(accessToken: string, refreshToken: string): Promise<void> {
    await storage.setItem(ACCESS_TOKEN_KEY, accessToken)
    await storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
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
  }

  async setInstallationId(id: string): Promise<void> {
    await storage.setItem(INSTALLATION_ID_KEY, id)
  }
}

export const apiClient = new ApiClient()
