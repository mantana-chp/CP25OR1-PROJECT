import prisma from '../../libs/db'
import { transfer_token_status, Prisma } from '../../generated/prisma/client'
import { TRANSFER_TOKEN_EXPIRY_MS } from './pet-transfer-types'

type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

// ─── Token Cleanup ────────────────────────────────────────────────────────────

export const expireStaleTokens = async () => {
  return prisma.pet_transfer_tokens.updateMany({
    where: {
      status: transfer_token_status.PENDING,
      expires_at: { lt: new Date() },
    },
    data: { status: transfer_token_status.EXPIRED },
  })
}

// ─── Create Token ─────────────────────────────────────────────────────────────

export const createTransferToken = async (
  petIds: string[],
  createdBy: string,
) => {
  const expiresAt = new Date(Date.now() + TRANSFER_TOKEN_EXPIRY_MS)

  return prisma.pet_transfer_tokens.create({
    data: {
      created_by: createdBy,
      expires_at: expiresAt,
      status: transfer_token_status.PENDING,
      transfer_pets: {
        create: petIds.map((petId) => ({ pet_id: petId })),
      },
    },
    include: {
      transfer_pets: { select: { pet_id: true } },
    },
  })
}

// ─── Find Token ───────────────────────────────────────────────────────────────

export const findTokenById = async (tokenId: string) => {
  return prisma.pet_transfer_tokens.findUnique({
    where: { id: tokenId },
    include: {
      transfer_pets: {
        include: {
          pet: {
            select: {
              id: true,
              user_id: true,
              pet_name: true,
              gender: true,
              birth_date: true,
              weight: true,
              species_id: true,
              breed_id: true,
              profile_image_key: true,
              status: true,
              species: { select: { name_th: true } },
              breeds: { select: { name_th: true } },
            },
          },
        },
      },
    },
  })
}

/**
 * Find token with minimal pet info (for re-validation inside transactions).
 */
export const findTokenByIdMinimal = async (
  tx: TransactionClient,
  tokenId: string,
) => {
  return tx.pet_transfer_tokens.findUnique({
    where: { id: tokenId },
    include: {
      transfer_pets: {
        include: {
          pet: { select: { id: true, user_id: true, status: true, deleted_at: true } },
        },
      },
    },
  })
}

// ─── Pending Token Checks ─────────────────────────────────────────────────────

/**
 * Check if any of the given pet IDs are included in a PENDING transfer token.
 */
export const findPendingTokensForPets = async (petIds: string[]) => {
  return prisma.pet_transfer_tokens.findMany({
    where: {
      status: transfer_token_status.PENDING,
      expires_at: { gt: new Date() },
      transfer_pets: {
        some: { pet_id: { in: petIds } },
      },
    },
    select: {
      id: true,
      transfer_pets: { select: { pet_id: true } },
    },
  })
}

/**
 * Find all pending transfers created by a specific user.
 */
export const findPendingTokensByCreator = async (createdBy: string) => {
  return prisma.pet_transfer_tokens.findMany({
    where: {
      created_by: createdBy,
      status: transfer_token_status.PENDING,
      expires_at: { gt: new Date() },
    },
    include: {
      transfer_pets: {
        include: {
          pet: { select: { id: true, pet_name: true } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  })
}

// ─── Token Status Updates ─────────────────────────────────────────────────────

export const markTokenCompleted = async (
  tx: TransactionClient,
  tokenId: string,
  claimedBy: string,
) => {
  return tx.pet_transfer_tokens.update({
    where: { id: tokenId },
    data: {
      status: transfer_token_status.COMPLETED,
      claimed_by: claimedBy,
      claimed_at: new Date(),
    },
  })
}

export const markTokenCancelled = async (tokenId: string) => {
  return prisma.pet_transfer_tokens.update({
    where: { id: tokenId },
    data: { status: transfer_token_status.CANCELLED },
  })
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const createAuditLog = async (
  tx: TransactionClient,
  data: {
    transferTokenId: string
    petId: string
    fromUserId: string
    toUserId: string
    action: string
    metadata?: Record<string, unknown>
  },
) => {
  return tx.pet_transfer_audit_logs.create({
    data: {
      transfer_token_id: data.transferTokenId,
      pet_id: data.petId,
      from_user_id: data.fromUserId,
      to_user_id: data.toUserId,
      action: data.action,
      metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
    },
  })
}

// ─── Migration Helpers (used inside transaction) ──────────────────────────────

/**
 * Transfer pet ownership to a new user.
 */
export const transferPetOwnership = async (
  tx: TransactionClient,
  petId: string,
  newOwnerId: string,
) => {
  return tx.pets.update({
    where: { id: petId },
    data: { user_id: newOwnerId },
  })
}

/**
 * Migrate all reminders for a pet to the new owner.
 */
export const migrateReminders = async (
  tx: TransactionClient,
  petId: string,
  newOwnerId: string,
) => {
  return tx.reminders.updateMany({
    where: { pet_id: petId },
    data: { user_id: newOwnerId },
  })
}

/**
 * Cancel pending notifications for a specific user on a specific pet.
 */
export const cancelPendingNotifications = async (
  tx: TransactionClient,
  petId: string,
  userId: string,
) => {
  return tx.notifications.updateMany({
    where: {
      pet_id: petId,
      user_id: userId,
      status: 'pending',
    },
    data: { status: 'failed' },
  })
}

/**
 * Cancel pending notifications linked to reminders of a pet for a specific user.
 */
export const cancelPendingReminderNotifications = async (
  tx: TransactionClient,
  petId: string,
  userId: string,
) => {
  const reminderIds = await tx.reminders.findMany({
    where: { pet_id: petId },
    select: { id: true },
  })
  const ids = reminderIds.map((r) => r.id)

  if (ids.length > 0) {
    await tx.notifications.updateMany({
      where: {
        reminder_id: { in: ids },
        user_id: userId,
        status: 'pending',
      },
      data: { status: 'failed' },
    })
  }
}

/**
 * Revoke all active caregiver access for a pet.
 */
export const revokeAllCaregiverAccess = async (
  tx: TransactionClient,
  petId: string,
) => {
  return tx.pet_user_access.updateMany({
    where: {
      pet_id: petId,
      revoked_at: null,
    },
    data: { revoked_at: new Date() },
  })
}

/**
 * Remove pet from any pending share invites.
 */
export const cleanupPendingShareInvites = async (
  tx: TransactionClient,
  petId: string,
) => {
  return tx.pet_share_invite_pets.deleteMany({
    where: {
      pet_id: petId,
      invite: {
        status: 'PENDING',
      },
    },
  })
}
