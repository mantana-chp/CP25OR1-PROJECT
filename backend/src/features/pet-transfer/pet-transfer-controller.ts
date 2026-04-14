import { Request, Response } from 'express'
import { asyncHandler } from '../../shared/asyncHandler'
import { sendSuccess } from '../../shared/response'
import * as petTransferService from './pet-transfer-service'
import {
  createTransferSchema,
  previewTransferSchema,
  acceptTransferSchema,
  cancelTransferSchema,
} from './pet-transfer-schema'

// ─── 1. Initiate Transfer ─────────────────────────────────────────────────────

// POST /v1/pet-transfers
export const initiateTransfer = asyncHandler(
  async (req: Request, res: Response) => {
    const { body } = createTransferSchema.parse(req)
    const { id: userId } = req.user!

    const result = await petTransferService.initiateTransfer(
      body.petIds,
      userId,
    )

    sendSuccess(res, result, 201)
  },
)

// ─── 2. Preview Transfer ──────────────────────────────────────────────────────

// GET /v1/pet-transfers/preview/:token
export const previewTransfer = asyncHandler(
  async (req: Request, res: Response) => {
    const { params } = previewTransferSchema.parse(req)
    const { id: userId } = req.user!

    const result = await petTransferService.previewTransfer(
      params.token,
      userId,
    )

    sendSuccess(res, result, 200)
  },
)

// ─── 3. Accept Transfer ──────────────────────────────────────────────────────

// POST /v1/pet-transfers/accept/:token
export const acceptTransfer = asyncHandler(
  async (req: Request, res: Response) => {
    const { params } = acceptTransferSchema.parse(req)
    const { id: userId } = req.user!

    const result = await petTransferService.acceptTransfer(params.token, userId)

    sendSuccess(res, result, 200)
  },
)

// ─── 4. Cancel Transfer ───────────────────────────────────────────────────────

// DELETE /v1/pet-transfers/:transferId
export const cancelTransfer = asyncHandler(
  async (req: Request, res: Response) => {
    const { params } = cancelTransferSchema.parse(req)
    const { id: userId } = req.user!

    const result = await petTransferService.cancelTransfer(
      params.transferId,
      userId,
    )

    sendSuccess(res, result, 200)
  },
)

// ─── 5. Get Pending Transfers ─────────────────────────────────────────────────

// GET /v1/pet-transfers/pending
export const getPendingTransfers = asyncHandler(
  async (req: Request, res: Response) => {
    const { id: userId } = req.user!

    const result = await petTransferService.getPendingTransfers(userId)

    sendSuccess(res, { pendingTransfers: result }, 200)
  },
)
