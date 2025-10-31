// lib/api/apiClient.ts
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'

// API Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'
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

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY)
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor - Handle errors globally
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
      if (error.response) {
        const { status, data } = error.response

        // Handle specific status codes
        switch (status) {
        case 401:
          // Unauthorized - Clear token and redirect to login
          await SecureStore.deleteItemAsync(TOKEN_KEY)
          throw new ApiError(401, 'เซสชันหมดอายุ โปรดเข้าสู่ระบบอีกครั้ง')

        case 403:
          throw new ApiError(
          403,
          'คุณไม่มีสิทธิ์ในการดำเนินการนี้'
          )

        case 404:
          throw new ApiError(404, 'ไม่พบทรัพยากร')

        case 422:
          throw new ApiError(
          422,
          'การตรวจสอบล้มเหลว',
          (data as any)?.errors
          )

        case 500:
          throw new ApiError(500, 'เกิดข้อผิดพลาดของเซิร์ฟเวอร์ โปรดลองอีกครั้ง')

        default:
          throw new ApiError(
          status,
          (data as any)?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
          )
        }
      } else if (error.request) {
        // Network error
        throw new ApiError(0, 'ข้อผิดพลาดของเครือข่าย โปรดตรวจสอบการเชื่อมต่อของคุณ')
      } else {
        throw new ApiError(
        0,
        error.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิด'
        )
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
    await SecureStore.setItemAsync(TOKEN_KEY, token)
  }

  async getToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(TOKEN_KEY)
  }

  async clearToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
  }
}

export const apiClient = new ApiClient()
