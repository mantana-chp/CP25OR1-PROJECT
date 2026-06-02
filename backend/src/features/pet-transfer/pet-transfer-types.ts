import { transfer_token_status } from '../../generated/prisma/client'

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface TransferTokenDto {
  transferId: string
  expiresAt: Date
  createdAt: Date
  petIds: string[]
}

export interface TransferPreviewPetDto {
  id: string
  petName: string
  species: string | null
  breed: string | null
  gender: string
  age: number | null
  weight: number | null
  profileImageUrl: string | null
  status: string
}

export interface TransferPreviewDto {
  transferId: string
  expiresAt: Date
  pets: TransferPreviewPetDto[]
  receiverCurrentPetCount: number
  incomingPetCount: number
  wouldExceedLimit: boolean
  maxPetLimit: number
}

export interface TransferResultDto {
  message: string
  transferredPets: TransferPreviewPetDto[]
}

export interface PendingTransferDto {
  transferId: string
  expiresAt: Date
  createdAt: Date
  pets: Array<{
    id: string
    petName: string
  }>
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const TRANSFER_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
export const MAX_PET_LIMIT = 30
