import { z } from 'zod'

// ─── Initiate Transfer ────────────────────────────────────────────────────────

// POST /v1/pet-transfers
export const createTransferSchema = z.object({
  body: z.object({
    petIds: z
      .array(z.uuid('Invalid pet ID format'))
      .min(1, 'At least one pet is required')
      .max(30, 'Cannot transfer more than 30 pets at once'),
  }),
})

export type CreateTransferPayload = z.infer<typeof createTransferSchema>['body']

// ─── Preview Transfer ─────────────────────────────────────────────────────────

// GET /v1/pet-transfers/preview/:token
export const previewTransferSchema = z.object({
  params: z.object({
    token: z.uuid('Invalid transfer token format'),
  }),
})

// ─── Accept Transfer ──────────────────────────────────────────────────────────

// POST /v1/pet-transfers/accept/:token
export const acceptTransferSchema = z.object({
  params: z.object({
    token: z.uuid('Invalid transfer token format'),
  }),
  body: z.object({
    confirmTransfer: z.literal(true, {
      error: 'confirmTransfer must be true to proceed',
    }),
  }),
})

// ─── Cancel Transfer ──────────────────────────────────────────────────────────

// DELETE /v1/pet-transfers/:transferId
export const cancelTransferSchema = z.object({
  params: z.object({
    transferId: z.uuid('Invalid transfer ID format'),
  }),
})

// ─── Get Pending Transfers ────────────────────────────────────────────────────

// GET /v1/pet-transfers/pending
export const getPendingTransfersSchema = z.object({})
