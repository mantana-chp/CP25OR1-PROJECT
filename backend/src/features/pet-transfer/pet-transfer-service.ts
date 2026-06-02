import prisma from '../../libs/db'
import * as repo from './pet-transfer-repository'
import * as petRepo from '../pets/pet-repository'
import * as sharingRepo from '../pet-sharing/pet-sharing-repository'
import { toPreviewPetDto } from './pet-transfer-mapper'
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} from '../../shared/errors'
import {
  transfer_token_status,
  pet_status,
} from '../../generated/prisma/client'
import { logger } from '../../libs/logger'
import {
  MAX_PET_LIMIT,
  type TransferTokenDto,
  type TransferPreviewDto,
  type TransferResultDto,
  type PendingTransferDto,
} from './pet-transfer-types'

// ─── 1. Initiate Transfer ─────────────────────────────────────────────────────

export const initiateTransfer = async (
  petIds: string[],
  userId: string,
): Promise<TransferTokenDto> => {
  const ownedActiveCount = await prisma.pets.count({
    where: {
      id: { in: petIds },
      user_id: userId,
      status: pet_status.ACTIVE,
      deleted_at: null,
    },
  })

  if (ownedActiveCount !== petIds.length) {
    throw new BadRequestError(
      'One or more pets not found, do not belong to you, or are not active.',
    )
  }

  // Last-pet guard: user must still have ≥ 1 accessible pet after transfer
  const totalOwnedActive = await petRepo.countActivePetsByUserId(userId)
  const totalSharedActive =
    await sharingRepo.countSharedActivePetsByUserId(userId)
  const remainingAfterTransfer =
    totalOwnedActive - petIds.length + totalSharedActive

  if (remainingAfterTransfer < 1) {
    throw new BadRequestError(
      'Cannot transfer your last accessible pet. You must have at least one active pet remaining.',
    )
  }

  const overlapping = await repo.findPendingTokensForPets(petIds)
  if (overlapping.length > 0) {
    const conflictingPetIds = overlapping.flatMap((t) =>
      t.transfer_pets
        .filter((tp) => petIds.includes(tp.pet_id))
        .map((tp) => tp.pet_id),
    )
    throw new ConflictError(
      `One or more pets already have a pending transfer: ${conflictingPetIds.join(', ')}`,
    )
  }

  await repo.expireStaleTokens()
  const token = await repo.createTransferToken(petIds, userId)

  return {
    transferId: token.id,
    expiresAt: token.expires_at,
    createdAt: token.created_at,
    petIds: token.transfer_pets.map((tp) => tp.pet_id),
  }
}

// ─── 2. Preview Transfer ──────────────────────────────────────────────────────

export const previewTransfer = async (
  tokenId: string,
  userId: string,
): Promise<TransferPreviewDto> => {
  const token = await repo.findTokenById(tokenId)

  if (!token) {
    throw new NotFoundError('Invalid transfer token.')
  }

  if (token.status !== transfer_token_status.PENDING) {
    if (token.status === transfer_token_status.EXPIRED) {
      throw new BadRequestError('Transfer token has expired.')
    }
    if (token.status === transfer_token_status.COMPLETED) {
      throw new BadRequestError('Transfer token has already been used.')
    }
    if (token.status === transfer_token_status.CANCELLED) {
      throw new BadRequestError('Transfer token has been cancelled.')
    }
  }

  if (token.expires_at < new Date()) {
    // Token expired but wasn't marked yet — expire it now
    await repo.expireStaleTokens()
    throw new BadRequestError('Transfer token has expired.')
  }

  if (token.created_by === userId) {
    throw new BadRequestError('You cannot accept your own transfer.')
  }

  const petProfiles = await Promise.all(
    token.transfer_pets
      .filter((tp) => tp.pet.status === pet_status.ACTIVE)
      .map((tp) => toPreviewPetDto(tp.pet)),
  )

  // Calculate receiver's current pet count
  const receiverOwnedCount = await petRepo.countActivePetsByUserId(userId)
  const receiverSharedCount =
    await sharingRepo.countSharedActivePetsByUserId(userId)
  const receiverCurrentPetCount = receiverOwnedCount + receiverSharedCount
  const incomingPetCount = petProfiles.length

  return {
    transferId: token.id,
    expiresAt: token.expires_at,
    pets: petProfiles,
    receiverCurrentPetCount,
    incomingPetCount,
    wouldExceedLimit:
      receiverCurrentPetCount + incomingPetCount > MAX_PET_LIMIT,
    maxPetLimit: MAX_PET_LIMIT,
  }
}

// ─── 3. Accept Transfer ──────────────────────────────────────────────────────

export const acceptTransfer = async (
  tokenId: string,
  userId: string,
): Promise<TransferResultDto> => {
  // Pre-validate outside transaction for fast fail
  const token = await repo.findTokenById(tokenId)

  if (!token) {
    throw new NotFoundError('Invalid transfer token.')
  }

  // Idempotency: if already completed by same user, return success
  if (
    token.status === transfer_token_status.COMPLETED &&
    token.claimed_by === userId
  ) {
    const petProfiles = await Promise.all(
      token.transfer_pets.map((tp) => toPreviewPetDto(tp.pet)),
    )
    return {
      message: 'Transfer already completed.',
      transferredPets: petProfiles,
    }
  }

  if (token.status !== transfer_token_status.PENDING) {
    if (token.status === transfer_token_status.EXPIRED) {
      throw new BadRequestError('Transfer token has expired.')
    }
    if (token.status === transfer_token_status.COMPLETED) {
      throw new BadRequestError('Transfer token has already been used.')
    }
    if (token.status === transfer_token_status.CANCELLED) {
      throw new BadRequestError('Transfer token has been cancelled.')
    }
  }

  if (token.expires_at < new Date()) {
    await repo.expireStaleTokens()
    throw new BadRequestError('Transfer token has expired.')
  }

  if (token.created_by === userId) {
    throw new BadRequestError('You cannot accept your own transfer.')
  }

  // Validate receiver pet limit
  const receiverOwnedCount = await petRepo.countActivePetsByUserId(userId)
  const receiverSharedCount =
    await sharingRepo.countSharedActivePetsByUserId(userId)
  const receiverCurrentPetCount = receiverOwnedCount + receiverSharedCount
  const incomingPetCount = token.transfer_pets.filter(
    (tp) => tp.pet.status === pet_status.ACTIVE,
  ).length

  if (receiverCurrentPetCount + incomingPetCount > MAX_PET_LIMIT) {
    throw new ConflictError(
      `Cannot accept transfer. You currently have ${receiverCurrentPetCount} pets and this transfer includes ${incomingPetCount} pets, which would exceed the maximum limit of ${MAX_PET_LIMIT}.`,
    )
  }

  const oldOwnerId = token.created_by
  const newOwnerId = userId

  // ─── Atomic Transaction ─────────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // Re-validate token status inside transaction (prevents race conditions)
    const lockedToken = await repo.findTokenByIdMinimal(tx, tokenId)
    if (
      !lockedToken ||
      lockedToken.status !== transfer_token_status.PENDING ||
      lockedToken.expires_at < new Date()
    ) {
      throw new BadRequestError(
        'Transfer token is no longer valid. It may have expired or been used.',
      )
    }

    let transferredCount = 0
    for (const { pet } of lockedToken.transfer_pets) {
      // Skip pets that are no longer active
      if (pet.status !== pet_status.ACTIVE || pet.deleted_at !== null) {
        logger.warn(
          `[PetTransfer] Skipping pet ${pet.id} — status: ${pet.status}, deleted: ${pet.deleted_at}`,
        )
        continue
      }

      // Verify the pet still belongs to the original owner
      if (pet.user_id !== oldOwnerId) {
        logger.warn(
          `[PetTransfer] Pet ${pet.id} no longer owned by ${oldOwnerId}. Skipping.`,
        )
        continue
      }

      // 1. Transfer pet ownership
      await repo.transferPetOwnership(tx, pet.id, newOwnerId)

      // 2. Migrate all reminders to new owner
      const migratedReminders = await repo.migrateReminders(
        tx,
        pet.id,
        newOwnerId,
      )

      // 3. Cancel pending notifications for old owner (both direct pet and reminder-based)
      await repo.cancelPendingNotifications(tx, pet.id, oldOwnerId)
      await repo.cancelPendingReminderNotifications(tx, pet.id, oldOwnerId)

      // 4. Revoke all caregiver access
      const revokedAccess = await repo.revokeAllCaregiverAccess(tx, pet.id)

      // 5. Clean up pending share invites
      await repo.cleanupPendingShareInvites(tx, pet.id)

      // 6. Write audit log for this pet
      await repo.createAuditLog(tx, {
        transferTokenId: tokenId,
        petId: pet.id,
        fromUserId: oldOwnerId,
        toUserId: newOwnerId,
        action: 'TRANSFER_COMPLETED',
        metadata: {
          remindersMigrated: migratedReminders.count,
          caregiversRevoked: revokedAccess.count,
        },
      })

      logger.info(
        `[PetTransfer] Pet ${pet.id} transferred from ${oldOwnerId} to ${newOwnerId}. ` +
          `Reminders migrated: ${migratedReminders.count}, Caregivers revoked: ${revokedAccess.count}`,
      )

      transferredCount++
    }

    // Guard: if every pet was skipped, do not complete the token — roll back instead
    if (transferredCount === 0) {
      throw new BadRequestError(
        'None of the pets in this transfer could be transferred. They may have been deleted, marked as deceased, or already transferred.',
      )
    }

    // 7. Mark token as completed
    await repo.markTokenCompleted(tx, tokenId, newOwnerId)
  })

  // ─── Build Response ──────────────────────────────────────────────────────

  const updatedToken = await repo.findTokenById(tokenId)
  const transferredPets = updatedToken
    ? await Promise.all(
        updatedToken.transfer_pets.map((tp) => toPreviewPetDto(tp.pet)),
      )
    : []

  return {
    message: 'Transfer completed successfully.',
    transferredPets,
  }
}

// ─── 4. Cancel Transfer ───────────────────────────────────────────────────────

export const cancelTransfer = async (
  transferId: string,
  userId: string,
): Promise<{ message: string }> => {
  const token = await prisma.pet_transfer_tokens.findFirst({
    where: { id: transferId, created_by: userId },
  })

  if (!token) {
    throw new NotFoundError('Transfer not found or does not belong to you.')
  }

  if (token.status !== transfer_token_status.PENDING) {
    throw new BadRequestError('Only pending transfers can be cancelled.')
  }

  await repo.markTokenCancelled(transferId)

  return { message: 'Transfer cancelled.' }
}

// ─── 5. Get Pending Transfers ─────────────────────────────────────────────────

export const getPendingTransfers = async (
  userId: string,
): Promise<PendingTransferDto[]> => {
  await repo.expireStaleTokens()

  const tokens = await repo.findPendingTokensByCreator(userId)

  return tokens.map((token) => ({
    transferId: token.id,
    expiresAt: token.expires_at,
    createdAt: token.created_at,
    pets: token.transfer_pets.map((tp) => ({
      id: tp.pet.id,
      petName: tp.pet.pet_name,
    })),
  }))
}
