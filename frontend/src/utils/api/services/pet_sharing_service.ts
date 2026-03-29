import {
  IAccessListResponse,
  ICaregiver,
  IClaimInviteResponse,
  IGenerateInviteResponse,
  IPendingInvite
} from '@/src/domain/pet_sharing.domain'
import { apiClient } from '../api_client'

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
    return apiClient.post<{ data: IClaimInviteResponse }>(
      `/v1/pet-shares/claim/${token}`
    )
  },

  listCaregivers: async (petId: string) => {
    return apiClient.get<{ data: ICaregiver[] }>(`/v1/pets/${petId}/caregivers`)
  },

  listAccessList: async (petId: string) => {
    return apiClient.get<{ data: IAccessListResponse }>(
      `/v1/pets/${petId}/access-list`
    )
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
