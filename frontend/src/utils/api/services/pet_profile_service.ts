import {
  DeletePetRequest,
  DeletePetResponse,
  IPetProfile,
  IPetProfileForm,
  ISpeciesAndBreeds
} from '@/src/domain/pet.domain'
import { apiClient } from '../api_client'

export const petProfileService = {
  /**
   * Get all active pets for the authenticated user
   */
  getMyPets: async () => {
    return apiClient.get<{
      data: IPetProfile[]
    }>('/v1/pets/me')
  },

  getPetProfileById: async (id: string) => {
    return apiClient.get<{ data: IPetProfileForm }>(`/v1/pets/me/${id}`)
  },

  createPetProfile: async (data: Omit<IPetProfileForm, 'id'>) => {
    return apiClient.post<{ data: IPetProfileForm }>('/v1/pets', data)
  },

  updatePetProfile: async (id: string, data: Partial<IPetProfileForm>) => {
    return apiClient.patch<{ data: IPetProfileForm }>(`/v1/pets/me/${id}`, data)
  },

  getSpeciesAndBreeds: async () => {
    return apiClient.get<ISpeciesAndBreeds>('/v1/meta/species-and-breeds')
  },

  /**
   * Update pet profile picture
   * Call this after successfully uploading image to MinIO
   * @param petId - Pet ID
   * @param objectKey - The object key returned from upload request
   */
  updateProfileImage: async (petId: string, objectKey: string) => {
    return apiClient.put<{ data: IPetProfile }>(
      `/v1/pets/me/${petId}/profile-image`,
      { objectKey }
    )
  },

  /**
   * Delete pet profile picture
   * @param petId - Pet ID
   */
  deleteProfileImage: async (petId: string) => {
    return apiClient.delete<{ data: IPetProfile }>(
      `/v1/pets/me/${petId}/profile-image`
    )
  },

  /**
   * Soft delete a pet (move to recently deleted)
   * @param petId - Pet ID
   * @returns Response with message and status
   */
  softDeletePet: async (petId: string) => {
    console.log('🗑️ Calling softDeletePet API for:', petId)
    const requestBody = {
      reason: 'JUST_DELETE' as const
    }
    console.log('📤 Request body:', requestBody)

    const response = await apiClient.delete<{ data: DeletePetResponse }>(
      `/v1/pets/me/${petId}`,
      {
        data: requestBody
      }
    )
    console.log('📥 Soft delete response:', response)
    return response
  },

  /**
   * Mark a pet as deceased
   * @param petId - Pet ID
   * @param deceasedDate - Optional date when pet passed away (ISO datetime)
   * @returns Response with message and status
   */
  markPetAsDeceased: async (petId: string, deceasedDate?: string) => {
    return apiClient.delete<{ data: DeletePetResponse }>(
      `/v1/pets/me/${petId}`,
      {
        data: {
          reason: 'DECEASED',
          deceased_date: deceasedDate
        } as DeletePetRequest
      }
    )
  },

  /**
   * Get past (deceased) pets for the authenticated user
   */
  getPastPets: async () => {
    return apiClient.get<{
      data: IPetProfile[]
    }>('/v1/pets/me/past')
  },

  /**
   * Get recently deleted pets (within 30 days)
   */
  getRecentlyDeletedPets: async () => {
    console.log('📡 Fetching recently deleted pets from API...')
    const response = await apiClient.get<{
      data: IPetProfile[]
    }>('/v1/pets/me/recently-deleted')
    return response
  },

  /**
   * Permanently delete a soft-deleted pet
   * @param petId - Pet ID
   * @returns Response with message
   */
  permanentDeletePet: async (petId: string) => {
    console.log('🗑️ Permanently deleting pet:', petId)
    const response = await apiClient.delete<{ data: { message: string } }>(
      `/v1/pets/me/${petId}/permanent`
    )
    console.log('📥 Permanent delete response:', response)
    return response
  }
}
