// src/utils/api/api_client.ts
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// API Configuration
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000'
const TOKEN_KEY = 'auth_token'

// Custom error class for better error handling
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public errors?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// 🔧 FIXED: Cross-platform storage utility
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
  }
}

// API Client Class
class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('✅ API Client initialized:', API_BASE_URL)
    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await storage.getItem(TOKEN_KEY)
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
            console.log('🔑 Token added to request')
          }
        } catch (error) {
          console.error('❌ Error getting token:', error)
        }
        console.log('📤 Request:', config.method?.toUpperCase(), config.url)
        return config
      },
      (error) => {
        console.error('❌ Request error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor - Handle errors globally
    this.client.interceptors.response.use(
      (response) => {
        console.log('✅ Response:', response.status, response.config.url)
        return response
      },
      async (error: AxiosError) => {
        console.error('❌ Response error:', error.message)

        if (error.response) {
          const { status, data } = error.response
          console.error('Status:', status, 'Data:', data)

          // Handle specific status codes
          switch (status) {
            case 401:
              await storage.removeItem(TOKEN_KEY)
              throw new ApiError(401, 'เซสชันหมดอายุ โปรดเข้าสู่ระบบอีกครั้ง')

            case 403:
              throw new ApiError(403, 'คุณไม่มีสิทธิ์ในการดำเนินการนี้')

            case 404:
              throw new ApiError(404, 'ไม่พบทรัพยากร')

            case 422:
              throw new ApiError(
                422,
                'การตรวจสอบล้มเหลว',
                (data as any)?.errors
              )

            case 500:
              throw new ApiError(
                500,
                'เกิดข้อผิดพลาดของเซิร์ฟเวอร์ โปรดลองอีกครั้ง'
              )

            default:
              throw new ApiError(
                status,
                (data as any)?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
              )
          }
        } else if (error.request) {
          console.error('❌ Network error - no response received')
          throw new ApiError(
            0,
            'ข้อผิดพลาดของเครือข่าย โปรดตรวจสอบการเชื่อมต่อของคุณ'
          )
        } else {
          throw new ApiError(0, error.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด')
        }
      }
    )
  }

  // Generic request method
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<T>(config)
    return response.data
  }

  // HTTP Methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url })
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data })
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data })
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data })
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url })
  }

  // Auth helpers
  async setToken(token: string): Promise<void> {
    await storage.setItem(TOKEN_KEY, token)
    console.log('✅ Token saved')
  }

  async getToken(): Promise<string | null> {
    return await storage.getItem(TOKEN_KEY)
  }

  async clearToken(): Promise<void> {
    await storage.removeItem(TOKEN_KEY)
    console.log('✅ Token cleared')
  }
}

export const apiClient = new ApiClient()
