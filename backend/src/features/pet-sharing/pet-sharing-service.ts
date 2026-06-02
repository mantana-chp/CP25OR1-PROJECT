import prisma from '../../libs/db'
import * as repo from './pet-sharing-repository'
import * as petRepo from '../pets/pet-repository'
import { generateDownloadUrl } from '../file-uploads/upload-service'
import { formatAgeFromBirthDate } from '../../shared/utils'
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
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
    avatar_background_color: pet.avatar_background_color ?? null,
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
    deletion_reason: pet.deletion_reason ?? null,
  }
}

// ─── 1. Generate Invite ───────────────────────────────────────────────────────

export const generateInvite = async (
  petIds: string[],
  userId: string,
  alias: string,
) => {
  const ownedCount = await prisma.pets.count({
    where: {
      id: { in: petIds },
      user_id: userId,
      status: 'ACTIVE',
      deleted_at: null,
    },
  })
  if (ownedCount !== petIds.length) {
    throw new BadRequestError(
      'One or more pets not found, do not belong to you, or are not active.',
    )
  }

  await repo.expireStaleInvites()

  const invite = await repo.createInvite(petIds, userId, alias)
  return {
    inviteId: invite.id,
    expiresAt: invite.expires_at,
    alias: invite.caregiver_alias,
    petIds: invite.invite_pets.map((ip) => ip.pet_id),
  }
}

// ─── 2. Preview Invite ────────────────────────────────────────────────────────

export const previewInvite = async (token: string, userId: string) => {
  const invite = await repo.findInviteById(token)

  if (!invite) {
    throw new NotFoundError('Invalid code')
  }

  if (
    invite.status !== invite_status.PENDING ||
    invite.expires_at < new Date()
  ) {
    throw new BadRequestError('Code expired or already used')
  }

  const ownerIds = [...new Set(invite.invite_pets.map((ip) => ip.pet.user_id))]
  if (ownerIds.includes(userId)) {
    throw new BadRequestError('You are already the owner of one of these pets')
  }

  // Categorize pets: to be added vs. already shared
  const toBeAddedPetIds: string[] = []
  const alreadySharedPetIds: string[] = []

  for (const { pet } of invite.invite_pets) {
    const petRecord = await prisma.pets.findUnique({
      where: { id: pet.id },
      select: { status: true, deleted_at: true },
    })

    if (
      !petRecord ||
      petRecord.status !== 'ACTIVE' ||
      petRecord.deleted_at !== null
    ) {
      // Skip inactive pets silently
      continue
    }

    const existing = await repo.findActiveAccess(pet.id, userId)
    if (existing) {
      alreadySharedPetIds.push(pet.id)
    } else {
      toBeAddedPetIds.push(pet.id)
    }
  }

  const [toBeAddedPets, alreadySharedPets] = await Promise.all([
    Promise.all(
      toBeAddedPetIds.map((petId) =>
        prisma.pets.findUnique({
          where: { id: petId },
          include: {
            species: { select: { name_th: true } },
            breeds: { select: { name_th: true } },
          },
        }),
      ),
    ),
    Promise.all(
      alreadySharedPetIds.map((petId) =>
        prisma.pets.findUnique({
          where: { id: petId },
          include: {
            species: { select: { name_th: true } },
            breeds: { select: { name_th: true } },
          },
        }),
      ),
    ),
  ])

  const toBeAddedProfiles = await Promise.all(
    toBeAddedPets.filter(Boolean).map(formatPetProfile),
  )
  const alreadySharedProfiles = await Promise.all(
    alreadySharedPets.filter(Boolean).map(formatPetProfile),
  )

  // Check if user already has 30 active pets (owned + shared)
  const ownedActivePets = await petRepo.countActivePetsByUserId(userId)
  const sharedActivePets = await repo.countSharedActivePetsByUserId(userId)
  const totalActivePets = ownedActivePets + sharedActivePets
  const canAcceptInvite = totalActivePets < 30

  return {
    expiresAt: invite.expires_at,
    toBeAdded: toBeAddedProfiles,
    alreadyShared: alreadySharedProfiles,
    canAcceptInvite,
    currentActivePets: totalActivePets,
  }
}

// ─── 3. Claim Invite ──────────────────────────────────────────────────────────

export const claimInvite = async (
  token: string,
  userId: string,
  installationId: string,
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
            breeds: { select: { name_th: true } },
          },
        }),
      ),
    )

    const profiles = await Promise.all(
      alreadyClaimedPets.filter(Boolean).map(formatPetProfile),
    )

    // For idempotent case, all pets are considered already shared
    return {
      added: [],
      alreadyShared: profiles,
    }
  }

  if (
    invite.status !== invite_status.PENDING ||
    invite.expires_at < new Date()
  ) {
    throw new BadRequestError('Code expired or already used')
  }

  const ownerIds = [...new Set(invite.invite_pets.map((ip) => ip.pet.user_id))]
  if (ownerIds.includes(userId)) {
    throw new BadRequestError('You are already the owner of one of these pets')
  }

  // Check if user already has 30 active pets (owned + shared from other users)
  const ownedActivePets = await petRepo.countActivePetsByUserId(userId)
  const sharedActivePets = await repo.countSharedActivePetsByUserId(userId)
  const totalActivePets = ownedActivePets + sharedActivePets

  if (totalActivePets >= 30) {
    throw new ConflictError(
      'Cannot accept invite. You have reached the maximum limit of 30 active pets.',
    )
  }

  const addedPetIds: string[] = []
  const alreadySharedPetIds: string[] = []

  // Transaction: for each unique owner ensure a contact, then create access per pet
  await prisma.$transaction(async (tx) => {
    const contactByOwner = new Map<string, string>()
    for (const ownerId of ownerIds) {
      const contact = await repo.ensureContact(
        tx,
        ownerId,
        userId,
        invite.caregiver_alias,
      )
      if (contact) contactByOwner.set(ownerId, contact.id)
    }

    for (const { pet } of invite.invite_pets) {
      // Pet may have been deceased or deleted after the invite was created
      const petRecord = await tx.pets.findUnique({
        where: { id: pet.id },
        select: { status: true, deleted_at: true },
      })
      if (
        !petRecord ||
        petRecord.status !== 'ACTIVE' ||
        petRecord.deleted_at !== null
      ) {
        // Skip inactive pets silently - continue processing others
        continue
      }

      const existing = await repo.findActiveAccess(pet.id, userId)
      if (existing) {
        // Already has access — track and skip
        alreadySharedPetIds.push(pet.id)
        continue
      }

      const contactId = contactByOwner.get(pet.user_id)
      if (!contactId) continue

      await repo.createAccess(tx, {
        petId: pet.id,
        userId,
        contactId,
        grantedBy: pet.user_id,
        inviteId: invite.id,
        installationId,
      })

      addedPetIds.push(pet.id)
    }

    await repo.markInviteAccepted(tx, invite.id, userId)
  })

  const [addedPets, alreadySharedPets] = await Promise.all([
    Promise.all(
      addedPetIds.map((petId) =>
        prisma.pets.findUnique({
          where: { id: petId },
          include: {
            species: { select: { name_th: true } },
            breeds: { select: { name_th: true } },
          },
        }),
      ),
    ),
    Promise.all(
      alreadySharedPetIds.map((petId) =>
        prisma.pets.findUnique({
          where: { id: petId },
          include: {
            species: { select: { name_th: true } },
            breeds: { select: { name_th: true } },
          },
        }),
      ),
    ),
  ])

  const addedProfiles = await Promise.all(
    addedPets.filter(Boolean).map(formatPetProfile),
  )
  const alreadySharedProfiles = await Promise.all(
    alreadySharedPets.filter(Boolean).map(formatPetProfile),
  )

  return {
    added: addedProfiles,
    alreadyShared: alreadySharedProfiles,
  }
}

// ─── 4. List Caregivers ───────────────────────────────────────────────────────

export const listCaregivers = async (petId: string) => {
  const rows = await repo.findCaregiversByPetId(petId)
  return rows.map((row) => ({
    accessId: row.id,
    contactId: row.contact.id,
    alias: row.contact.alias,
    grantedAt: row.granted_at,
  }))
}

export const listAccessList = async (
  petId: string,
  userId: string,
  petRole?: 'OWNER' | 'CAREGIVER',
) => {
  const rows = await repo.findCaregiversByPetId(petId)
  const caregivers = rows.map((row) => ({
    accessId: row.id,
    contactId: row.contact.id,
    alias: row.contact.alias,
    grantedAt: row.granted_at,
  }))

  let selfAccessId: string | null = null
  if (petRole === 'CAREGIVER') {
    const selfAccess = await repo.findActiveAccess(petId, userId)
    selfAccessId = selfAccess?.id ?? null
  }

  return {
    caregivers,
    selfAccessId,
  }
}

// ─── 5. Update Alias ─────────────────────────────────────────────────────────

export const updateAlias = async (
  contactId: string,
  userId: string,
  alias: string,
) => {
  const contact = await prisma.owner_caregiver_contacts.findFirst({
    where: { id: contactId, owner_user_id: userId },
  })

  if (!contact) {
    throw new NotFoundError('Contact not found or does not belong to you.')
  }

  return prisma.owner_caregiver_contacts.update({
    where: { id: contactId },
    data: { alias, updated_at: new Date() },
    select: { id: true, alias: true, updated_at: true },
  })
}

// ─── 6. Revoke Caregiver ──────────────────────────────────────────────────────

export const revokeCaregiver = async (
  petId: string,
  accessId: string,
  userId: string,
) => {
  // Ownership validated by requireOwner middleware.
  const access = await prisma.pet_user_access.findFirst({
    where: { id: accessId, pet_id: petId },
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

// ─── 7. List Pending Invites ──────────────────────────────────────────────────

export const listPendingInvites = async (userId: string) => {
  const invites = await repo.findPendingInvitesByCreator(userId)
  return invites.map((inv) => ({
    inviteId: inv.id,
    alias: inv.caregiver_alias,
    expiresAt: inv.expires_at,
    createdAt: inv.created_at,
    pets: inv.invite_pets.map((ip) => ({
      id: ip.pet.id,
      pet_name: ip.pet.pet_name,
    })),
  }))
}

// ─── 8. Cancel Invite ─────────────────────────────────────────────────────────

export const cancelInvite = async (inviteId: string, userId: string) => {
  const invite = await prisma.pet_share_invites.findFirst({
    where: { id: inviteId, created_by: userId },
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

// ─── 9. Has Accessible Pets (startup check) ───────────────────────────────────

export const hasAccessiblePets = async (userId: string): Promise<boolean> => {
  return repo.hasAnyAccessiblePet(userId)
}
