import prisma from '../../libs/db'
import * as repo from './pet-sharing-repository'
import * as petRepo from '../pets/pet-repository'
import { generateDownloadUrl } from '../file-uploads/upload-service'
import { formatAgeFromBirthDate } from '../../shared/utils'
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError
} from '../../shared/errors'
import { invite_status } from '../../generated/prisma/client'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPetProfile = async (pet: any) => {
  let profileImageUrl = null
  if (pet.profile_image_key) {
    try {
      profileImageUrl = await generateDownloadUrl(pet.profile_image_key, 3600)
    } catch {
      profileImageUrl = null
    }
  }

  return {
    id: pet.id,
    pet_name: pet.pet_name,
    gender: pet.gender,
    birth_date: pet.birth_date,
    weight: pet.weight,
    species_id: pet.species_id,
    species: pet.species?.name_th ?? null,
    breed_id: pet.breed_id,
    breed: pet.breeds?.name_th ?? null,
    age: pet.birth_date ? formatAgeFromBirthDate(pet.birth_date) : null,
    profile_image_url: profileImageUrl,
    petRole: 'CAREGIVER',
    status: pet.status,
    deceased_date: pet.deceased_date ?? null,
    deleted_at: pet.deleted_at ?? null,
    deletion_reason: pet.deletion_reason ?? null
  }
}

// ─── 1. Generate Invite ───────────────────────────────────────────────────────

export const generateInvite = async (
  petIds: string[],
  userId: string,
  alias: string
) => {
  // Verify the requesting user owns ALL supplied pets and they are all ACTIVE
  const ownedCount = await prisma.pets.count({
    where: {
      id: { in: petIds },
      user_id: userId,
      status: 'ACTIVE',
      deleted_at: null
    }
  })
  if (ownedCount !== petIds.length) {
    throw new BadRequestError(
      'One or more pets not found, do not belong to you, or are not active.'
    )
  }

  await repo.expireStaleInvites()

  const invite = await repo.createInvite(petIds, userId, alias)
  return {
    inviteId: invite.id,
    expiresAt: invite.expires_at,
    alias: invite.caregiver_alias,
    petIds: invite.invite_pets.map((ip) => ip.pet_id)
  }
}

// ─── 2. Claim Invite ──────────────────────────────────────────────────────────

export const claimInvite = async (
  token: string,
  userId: string,
  installationId: string
) => {
  const invite = await repo.findInviteById(token)

  if (!invite) {
    throw new NotFoundError('Invalid code')
  }

  // Idempotent claim for the same user: if already accepted by this caregiver,
  // return the linked pets instead of failing with "already used".
  if (
    invite.status === invite_status.ACCEPTED &&
    invite.claimed_by === userId
  ) {
    const alreadyClaimedPets = await Promise.all(
      invite.invite_pets.map(({ pet }) =>
        prisma.pets.findUnique({
          where: { id: pet.id },
          include: {
            species: { select: { name_th: true } },
            breeds: { select: { name_th: true } }
          }
        })
      )
    )

    return Promise.all(alreadyClaimedPets.filter(Boolean).map(formatPetProfile))
  }

  if (
    invite.status !== invite_status.PENDING ||
    invite.expires_at < new Date()
  ) {
    throw new BadRequestError('Code expired or already used')
  }

  // Reject if the claimer is the owner of any pet in the invite
  const ownerIds = [...new Set(invite.invite_pets.map((ip) => ip.pet.user_id))]
  if (ownerIds.includes(userId)) {
    throw new BadRequestError('You are already the owner of one of these pets')
  }

  const invitePetIds = invite.invite_pets.map((invitePet) => invitePet.pet.id)
  const existingActiveAccessCount = await prisma.pet_user_access.count({
    where: {
      user_id: userId,
      revoked_at: null,
      pet_id: { in: invitePetIds }
    }
  })

  if (existingActiveAccessCount === invitePetIds.length) {
    throw new BadRequestError('You are already a caregiver for this pet')
  }

  // Transaction: for each unique owner ensure a contact, then create access per pet
  await prisma.$transaction(async (tx) => {
    const contactByOwner = new Map<string, string>()
    for (const ownerId of ownerIds) {
      const contact = await repo.ensureContact(
        tx,
        ownerId,
        userId,
        invite.caregiver_alias
      )
      if (contact) contactByOwner.set(ownerId, contact.id)
    }

    for (const { pet } of invite.invite_pets) {
      // Pet may have been deceased or deleted after the invite was created
      const petRecord = await tx.pets.findUnique({
        where: { id: pet.id },
        select: { status: true, deleted_at: true }
      })
      if (
        !petRecord ||
        petRecord.status !== 'ACTIVE' ||
        petRecord.deleted_at !== null
      ) {
        throw new BadRequestError(
          'One or more pets in this invite are no longer active. Please ask the owner to generate a new invite.'
        )
      }

      const existing = await repo.findActiveAccess(pet.id, userId)
      if (existing) continue // already has access — skip silently

      const contactId = contactByOwner.get(pet.user_id)
      if (!contactId) continue

      await repo.createAccess(tx, {
        petId: pet.id,
        userId,
        contactId,
        grantedBy: pet.user_id,
        inviteId: invite.id,
        installationId
      })
    }

    await repo.markInviteAccepted(tx, invite.id, userId)
  })

  // Return full profiles for all pets granted in this invite
  const pets = await Promise.all(
    invite.invite_pets.map(({ pet }) =>
      prisma.pets.findUnique({
        where: { id: pet.id },
        include: {
          species: { select: { name_th: true } },
          breeds: { select: { name_th: true } }
        }
      })
    )
  )

  return Promise.all(pets.filter(Boolean).map(formatPetProfile))
}

// ─── 3. List Caregivers ───────────────────────────────────────────────────────

export const listCaregivers = async (petId: string) => {
  const rows = await repo.findCaregiversByPetId(petId)
  return rows.map((row) => ({
    accessId: row.id,
    contactId: row.contact.id,
    alias: row.contact.alias,
    grantedAt: row.granted_at
  }))
}

// ─── 4. Update Alias ─────────────────────────────────────────────────────────

export const updateAlias = async (
  contactId: string,
  userId: string,
  alias: string
) => {
  // findUnique with owner check — throws if not found
  const contact = await prisma.owner_caregiver_contacts.findFirst({
    where: { id: contactId, owner_user_id: userId }
  })

  if (!contact) {
    throw new NotFoundError('Contact not found or does not belong to you.')
  }

  return prisma.owner_caregiver_contacts.update({
    where: { id: contactId },
    data: { alias, updated_at: new Date() },
    select: { id: true, alias: true, updated_at: true }
  })
}

// ─── 5. Revoke Caregiver ──────────────────────────────────────────────────────

export const revokeCaregiver = async (
  petId: string,
  accessId: string,
  userId: string
) => {
  // Ownership validated by requireOwner middleware.
  const access = await prisma.pet_user_access.findFirst({
    where: { id: accessId, pet_id: petId }
  })

  if (!access) {
    throw new NotFoundError('Caregiver access record not found.')
  }

  if (access.revoked_at) {
    throw new BadRequestError('This caregiver access has already been revoked.')
  }

  await repo.revokeAccess(accessId, petId)
  return { message: 'Caregiver access revoked.' }
}

// ─── 6. List Pending Invites ──────────────────────────────────────────────────

export const listPendingInvites = async (userId: string) => {
  const invites = await repo.findPendingInvitesByCreator(userId)
  return invites.map((inv) => ({
    inviteId: inv.id,
    alias: inv.caregiver_alias,
    expiresAt: inv.expires_at,
    createdAt: inv.created_at,
    pets: inv.invite_pets.map((ip) => ({
      id: ip.pet.id,
      pet_name: ip.pet.pet_name
    }))
  }))
}

// ─── 7. Cancel Invite ─────────────────────────────────────────────────────────

export const cancelInvite = async (inviteId: string, userId: string) => {
  const invite = await prisma.pet_share_invites.findFirst({
    where: { id: inviteId, created_by: userId }
  })

  if (!invite) {
    throw new NotFoundError('Invite not found or does not belong to you.')
  }

  if (invite.status !== invite_status.PENDING) {
    throw new BadRequestError('Only PENDING invites can be cancelled.')
  }

  await repo.markInviteExpired(inviteId)
  return { message: 'Invite cancelled.' }
}

// ─── 8. Has Accessible Pets (startup check) ───────────────────────────────────

export const hasAccessiblePets = async (userId: string): Promise<boolean> => {
  return repo.hasAnyAccessiblePet(userId)
}
