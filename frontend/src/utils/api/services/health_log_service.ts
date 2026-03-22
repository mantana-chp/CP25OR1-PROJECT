import { apiClient } from '../api_client'

export interface IHealthLog {
  id: string
  petId: string
  createdByUserId: string
  createdBy: string
  description: string
  type?: 'WEIGHT' | 'SYMPTOMS' | 'BEHAVIOR' // Will be provided by backend in future
  weight?: number
  note?: string
  loggedAt: string
  createdAt: string
  updatedAt: string
}

export interface GetHealthLogsResponse {
  data: {
    logs: IHealthLog[]
    total: number
  }
}

export interface CreateHealthLogPayload {
  description: string
  weight?: number
  note?: string
  loggedAt?: string
}

export interface UpdateHealthLogPayload {
  description?: string
  weight?: number
  note?: string | null
  loggedAt?: string
}

export const healthLogService = {
  getHealthLogs: async (
    petId: string,
    params?: { limit?: number; offset?: number }
  ) => {
    return apiClient.get<GetHealthLogsResponse>(
      `/v1/pets/${petId}/health-logs`,
      {
        params
      }
    )
  },

  getHealthLogById: async (petId: string, logId: string) => {
    return apiClient.get<{ data: { log: IHealthLog } }>(
      `/v1/pets/${petId}/health-logs/${logId}`
    )
  },

  createHealthLog: async (petId: string, payload: CreateHealthLogPayload) => {
    return apiClient.post<{ data: { log: IHealthLog } }>(
      `/v1/pets/${petId}/health-logs`,
      payload
    )
  },

  updateHealthLog: async (
    petId: string,
    logId: string,
    payload: UpdateHealthLogPayload
  ) => {
    return apiClient.patch<{ data: { log: IHealthLog } }>(
      `/v1/pets/${petId}/health-logs/${logId}`,
      payload
    )
  },

  deleteHealthLog: async (petId: string, logId: string) => {
    return apiClient.delete(`/v1/pets/${petId}/health-logs/${logId}`)
  }
}
