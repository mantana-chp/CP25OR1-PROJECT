import { apiClient } from '../api_client'
import {
  WeightChartResponse,
  WeightChartView
} from '@/src/domain/weight-chart.domain'

export type HealthLogCategory = 'WEIGHT' | 'SYMPTOMS' | 'BEHAVIOR'

export interface IHealthLog {
  id: string
  petId: string
  createdByUserId: string
  createdBy: string
  category: HealthLogCategory
  description: string
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
  category: HealthLogCategory
  description: string
  weight?: number
  note?: string
  loggedAt?: string
  upsert?: boolean
}

export interface CreateHealthLogData {
  log?: IHealthLog
  conflict?: boolean
  message?: string
  suspiciousChange?: boolean
  warningMessage?: string
}

export interface CreateHealthLogResponse {
  status: {
    code: string
    description: string
  }
  data: CreateHealthLogData
}

export interface UpdateHealthLogPayload {
  category?: HealthLogCategory
  description?: string
  weight?: number
  note?: string | null
  loggedAt?: string
}

export interface GetWeightChartParams {
  view?: WeightChartView
  date?: string
}

export const healthLogService = {
  getHealthLogs: async (
    petId: string,
    params?: { limit?: number; offset?: number },
  ) => {
    return apiClient.get<GetHealthLogsResponse>(
      `/v1/pets/${petId}/health-logs`,
      {
        params,
      },
    )
  },

  getHealthLogById: async (petId: string, logId: string) => {
    return apiClient.get<{ data: { log: IHealthLog } }>(
      `/v1/pets/${petId}/health-logs/${logId}`,
    )
  },

  getWeightChart: async (petId: string, params?: GetWeightChartParams) => {
    return apiClient.get<WeightChartResponse>(
      `/v1/pets/${petId}/health-logs/weight-chart`,
      {
        params
      }
    )
  },

  createHealthLog: async (petId: string, payload: CreateHealthLogPayload) => {
    return apiClient.post<CreateHealthLogResponse>(
      `/v1/pets/${petId}/health-logs`,
      payload,
    )
  },

  updateHealthLog: async (
    petId: string,
    logId: string,
    payload: UpdateHealthLogPayload,
  ) => {
    return apiClient.patch<{ data: { log: IHealthLog } }>(
      `/v1/pets/${petId}/health-logs/${logId}`,
      payload,
    )
  },

  deleteHealthLog: async (petId: string, logId: string) => {
    return apiClient.delete(`/v1/pets/${petId}/health-logs/${logId}`)
  },
}
