import { Router } from 'express'
import { authGuard } from '../../middlewares/authGuard'
import { validate } from '../../middlewares/validate'
import {
  initiateTransfer,
  previewTransfer,
  acceptTransfer,
  cancelTransfer,
  getPendingTransfers,
} from './pet-transfer-controller'
import {
  createTransferSchema,
  previewTransferSchema,
  acceptTransferSchema,
  cancelTransferSchema,
  getPendingTransfersSchema,
} from './pet-transfer-schema'

const petTransferRoutes = Router()

/**
 * @openapi
 * /pet-transfers:
 *   post:
 *     tags: [Pet Transfer]
 *     summary: Initiate a pet ownership transfer
 *     description: >
 *       Current owner creates a one-time transfer token for one or more pets.
 *       The token expires after 1 hour. All selected pets must be owned by the
 *       requesting user and must be ACTIVE. The user must have at least one
 *       accessible pet remaining after the transfer.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - petIds
 *             properties:
 *               petIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 30
 *     responses:
 *       201:
 *         description: Transfer token created successfully
 *       400:
 *         description: Bad request (invalid pets, last pet guard, etc.)
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Conflict (overlapping pending transfer)
 */
petTransferRoutes.post(
  '/',
  authGuard,
  validate(createTransferSchema),
  initiateTransfer,
)

/**
 * @openapi
 * /pet-transfers/preview/{token}:
 *   get:
 *     tags: [Pet Transfer]
 *     summary: Preview a transfer before accepting
 *     description: >
 *       Receiver scans QR or enters the transfer token UUID to see a summary
 *       of the pets being transferred, including their current pet count and
 *       whether accepting would exceed the 30-pet limit.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: token
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transfer preview with pet details and limit info
 *       400:
 *         description: Token expired, used, or cancelled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invalid transfer token
 */
petTransferRoutes.get(
  '/preview/:token',
  authGuard,
  validate(previewTransferSchema),
  previewTransfer,
)

/**
 * @openapi
 * /pet-transfers/accept/{token}:
 *   post:
 *     tags: [Pet Transfer]
 *     summary: Accept a pet ownership transfer
 *     description: >
 *       Receiver confirms the transfer. Requires confirmTransfer: true in the
 *       body as a 2nd-layer confirmation. This atomically transfers all pets
 *       in the token: updates ownership, migrates reminders, cancels old
 *       owner's pending notifications, revokes all caregiver access, and
 *       writes audit logs. If any step fails, the entire operation rolls back.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: token
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - confirmTransfer
 *             properties:
 *               confirmTransfer:
 *                 type: boolean
 *                 enum: [true]
 *     responses:
 *       200:
 *         description: Transfer completed successfully
 *       400:
 *         description: Token expired, used, cancelled, or self-transfer attempt
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invalid transfer token
 *       409:
 *         description: Would exceed 30-pet limit
 */
petTransferRoutes.post(
  '/accept/:token',
  authGuard,
  validate(acceptTransferSchema),
  acceptTransfer,
)

/**
 * @openapi
 * /pet-transfers/{transferId}:
 *   delete:
 *     tags: [Pet Transfer]
 *     summary: Cancel a pending transfer
 *     description: >
 *       Owner cancels a pending transfer token. Only the creator can cancel.
 *       Only PENDING tokens can be cancelled.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *       - name: transferId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Transfer cancelled
 *       400:
 *         description: Token is not pending
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transfer not found or doesn't belong to user
 */
petTransferRoutes.delete(
  '/:transferId',
  authGuard,
  validate(cancelTransferSchema),
  cancelTransfer,
)

/**
 * @openapi
 * /pet-transfers/pending:
 *   get:
 *     tags: [Pet Transfer]
 *     summary: List pending transfers created by the current user
 *     description: >
 *       Returns all active PENDING transfer tokens created by the authenticated
 *       user that have not yet expired.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/InstallationIdHeader'
 *     responses:
 *       200:
 *         description: List of pending transfers with pet summaries
 *       401:
 *         description: Unauthorized
 */
petTransferRoutes.get(
  '/pending',
  authGuard,
  validate(getPendingTransfersSchema),
  getPendingTransfers,
)

export default petTransferRoutes
