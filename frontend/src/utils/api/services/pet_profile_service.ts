import {
  IPetProfile,
  IPetProfileForm,
  ISpeciesAndBreeds
} from '@/src/domain/pet.domain'
import { apiClient } from '../api_client'

export const petProfileService = {
  /**
   * Get all pets for the authenticated user
   */
  getMyPets: async () => {
    return apiClient.get<{
      data: IPetProfile[]
    }>('/v1/pets/me')
  },

  getPetProfileById: async (id: string) => {
    return apiClient.get<IPetProfileForm>(`/v1/pets/${id}`)
  },

  createPetProfile: async (data: Omit<IPetProfileForm, 'id'>) => {
    return apiClient.post<IPetProfileForm>('/v1/pets', data)
  },

  getSpeciesAndBreeds: async () => {
    return apiClient.get<ISpeciesAndBreeds>('/v1/meta/species-and-breeds')
  }
}
