export interface AuthResponse {
  accessToken: string
  expiresIn?: number
  refreshToken?: string
}

export interface User {
  id: string
  status: string
  current_installation_id: string
  current_platform: string
  current_platform_device_id: string
  current_platform_id_source: string
  created_at: string
  updated_at: string | null
  last_active_at: string | null
}

export interface DeviceLoginResponse {
  user: User
  accessToken: string
  refreshToken: string
}
