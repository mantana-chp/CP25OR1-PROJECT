import { IPetProfile } from '@/src/domain/pet.domain'
import { apiClient } from '../api_client'

export interface ICaregiver {
  accessId: string
  contactId: string
  alias: string
  grantedAt: string
}

export interface IPendingInvitePet {
  id: string
  pet_name: string
}

export interface IPendingInvite {
  inviteId: string
  alias: string
  expiresAt: string
  createdAt: string
  pets: IPendingInvitePet[]
}

export interface IGenerateInviteResponse {
  inviteId: string
  expiresAt: string
  alias: string
  petIds: string[]
}

export const petSharingService = {
  generateInvite: async (petIds: string[], alias: string) => {
    return apiClient.post<{ data: IGenerateInviteResponse }>(
      '/v1/pets/invite',
      {
        petIds,
        alias
      }
    )
  },

  claimInvite: async (token: string) => {
    return apiClient.post<{ data: IPetProfile[] }>(
      `/v1/pet-shares/claim/${token}`
    )
  },

  listCaregivers: async (petId: string) => {
    return apiClient.get<{ data: ICaregiver[] }>(`/v1/pets/${petId}/caregivers`)
  },

  revokeCaregiver: async (petId: string, accessId: string) => {
    return apiClient.delete<{ data: { message: string } }>(
      `/v1/pets/${petId}/caregivers/${accessId}`
    )
  },

  listPendingInvites: async () => {
    return apiClient.get<{ data: IPendingInvite[] }>('/v1/pets/invites')
  },

  cancelInvite: async (inviteId: string) => {
    return apiClient.delete<{ data: { message: string } }>(
      `/v1/pets/invites/${inviteId}`
    )
  }
}
