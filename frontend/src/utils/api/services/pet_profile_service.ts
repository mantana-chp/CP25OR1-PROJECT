import { IPetProfile, ISpeciesAndBreeds } from '@/src/domain/pet.domain'
import { apiClient } from '../api_client'

export const petProfileService = {
  getPetProfileById: async (id: string) => {
    return apiClient.get<IPetProfile>(`/v1/pets/${id}`)
  },

  createPetProfile: async (data: Omit<IPetProfile, 'id'>) => {
    return apiClient.post<IPetProfile>('/v1/pets', data)
  },

  getSpeciesAndBreeds: async () => {
    return apiClient.get<ISpeciesAndBreeds>(
      '/v1/meta/species-and-breeds'
    )
  }
}
