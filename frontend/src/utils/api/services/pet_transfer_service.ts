import {
  IPendingTransfer,
  ITransferAcceptResponse,
  ITransferPreviewResponse,
  ITransferTokenResponse,
} from '@/src/domain/pet_transfer.domain'
import { apiClient } from '../api_client'

export const petTransferService = {
  initiateTransfer: async (petIds: string[]) => {
    return apiClient.post<{ data: ITransferTokenResponse }>(
      '/v1/pet-transfers',
      {
        petIds,
      },
    )
  },

  previewTransfer: async (transferId: string) => {
    return apiClient.get<{ data: ITransferPreviewResponse }>(
      `/v1/pet-transfers/preview/${transferId}`,
    )
  },

  acceptTransfer: async (transferId: string) => {
    return apiClient.post<{ data: ITransferAcceptResponse }>(
      `/v1/pet-transfers/accept/${transferId}`,
      {
        confirmTransfer: true,
      },
    )
  },

  cancelTransfer: async (transferId: string) => {
    return apiClient.delete<{ data: { message: string } }>(
      `/v1/pet-transfers/${transferId}`,
    )
  },

  listPendingTransfers: async () => {
    return apiClient.get<{
      data: IPendingTransfer[] | { pendingTransfers: IPendingTransfer[] }
    }>('/v1/pet-transfers/pending')
  },
}
