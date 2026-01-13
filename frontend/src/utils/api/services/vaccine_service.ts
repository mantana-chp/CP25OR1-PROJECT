import { apiClient } from '../api_client'
import { IVaccine, ICalculateVaccineRequest, ICalculatedDose } from '@/src/domain/vaccine.domain'

export const vaccineService = {
  /**
   * Get list of available vaccines for a specific pet
   */
  getVaccineList: async (petId: string) => {
    return apiClient.get<IVaccine[]>(`/v1/vaccines/${petId}`)
  },

  /**
   * Calculate vaccine schedule based on pet, vaccine type and start date
   */
  calculateVaccineSchedule: async (data: ICalculateVaccineRequest) => {
    return apiClient.post<ICalculatedDose[]>('/v1/vaccines/calculate', data)
  },
}
