import * as petRepository from './pet-repository'
import * as sharingRepository from '../pet-sharing/pet-sharing-repository'
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../shared/errors'
import {
  Prisma,
  pet_status,
  HealthLogCategory,
  reminder_status,
  notification_status,
  RecurrenceStatusEnum,
} from '../../generated/prisma/client'
import { type PetUpdatePayload } from './pet-schema'
import { formatAgeFromBirthDate } from '../../shared/utils'
import { generateDownloadUrl, deleteFile } from '../file-uploads/upload-service'
import prisma from '../../libs/db'
import { exceedsSpeciesMaxWeight, getSpeciesMaxWeightKg } from '../../shared/weight-validation'
import * as healthLogRepository from '../health-log/health-log-repository'

const DEFAULT_PET_AVATAR_BACKGROUND_COLOR = '#5FA7D1'

const resolveAvatarBackgroundColor = (color?: string | null) => {
  if (!color) return DEFAULT_PET_AVATAR_BACKGROUND_COLOR
  const normalized = color.trim()
  return normalized.length > 0
    ? normalized
    : DEFAULT_PET_AVATAR_BACKGROUND_COLOR
}

export type PetCreationData = {
  pet_name: string
  avatar_background_color?: string | null
  species_id: string
  breed_id?: string | null
  gender: 'male' | 'female' | 'unknown'
  weight?: number | null
  birth_date?: string | null
}

const normalizePetNameForComparison = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toLowerCase()

const getDuplicateNormalizedNames = (names: string[]) => {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const name of names) {
    if (seen.has(name)) {
      duplicates.add(name)
      continue
    }
    seen.add(name)
  }

  return [...duplicates]
}

const assertUniqueActivePetName = async (
  userId: string,
  petName: string,
  excludePetId?: string,
) => {
  const normalizedTargetName = normalizePetNameForComparison(petName)
  const activePetNames = await petRepository.findActivePetNamesByUserId(
    userId,
    excludePetId,
  )

  const hasDuplicate = activePetNames.some(
    (pet) =>
      normalizePetNameForComparison(pet.pet_name) === normalizedTargetName,
  )

  if (hasDuplicate) {
    throw new ConflictError(
      `You already have an active pet named "${petName.trim()}". Please choose a different name.`,
    )
  }
}

const assertPetProfileObjectKey = (
  objectKey: string,
  userId: string,
  petId: string,
) => {
  const expectedPrefix = `pet-images/${userId}/${petId}/`
  if (!objectKey.startsWith(expectedPrefix)) {
    throw new BadRequestError('Invalid object key for this pet profile image.')
  }
}

const formatPetProfile = async (pet: any) => {
  if (!pet) return null
  const petRole = pet.petRole === 'CAREGIVER' ? 'CAREGIVER' : 'OWNER'

  // Generate presigned URL for profile image if it exists
  let profileImageUrl = null
  if (pet.profile_image_key) {
    try {
      profileImageUrl = await generateDownloadUrl(pet.profile_image_key, 3600)
    } catch (error) {
      // If image is missing, set to null
      profileImageUrl = null
    }
  }

  return {
    id: pet.id,
    pet_name: pet.pet_name,
    avatar_background_color: pet.avatar_background_color ?? null,
    gender: pet.gender,
    birth_date: pet.birth_date,
    weight: pet.weight ? parseFloat(pet.weight.toString()) : null,
    species_id: pet.species_id,
    species: pet.species?.name_th || null,
    breed_id: pet.breed_id,
    breed: pet.breeds?.name_th || null,
    age: pet.birth_date ? formatAgeFromBirthDate(pet.birth_date) : null,
    profile_image_url: profileImageUrl,
    petRole,
    status: pet.status,
    deceased_date: pet.deceased_date ?? null,
    deleted_at: pet.deleted_at ?? null,
    deletion_reason: pet.deletion_reason ?? null,
  }
}

export const createPet = async (userId: string, petData: PetCreationData) => {
  const petCount = await petRepository.countByUserId(userId)
  if (petCount >= 30) {
    throw new ConflictError('You have reached the maximum limit of 30 pets.')
  }

  await assertUniqueActivePetName(userId, petData.pet_name)

  // Validate weight against the absolute biological max for this species
  if (petData.weight != null) {
    const species = await prisma.species.findUnique({
      where: { id: petData.species_id },
      select: { name: true },
    })
    const speciesName = species?.name ?? 'DEFAULT'
    if (exceedsSpeciesMaxWeight(petData.weight, speciesName)) {
      const maxKg = getSpeciesMaxWeightKg(speciesName)
      throw new BadRequestError(
        `น้ำหนักที่ระบุ (${petData.weight.toFixed(2)} kg) เกินค่าสูงสุดที่เป็นไปได้สำหรับสัตว์เลี้ยงประเภทนี้ (สูงสุด ${maxKg} kg) กรุณาตรวจสอบอีกครั้ง`
      )
    }
  }

  const data: Prisma.petsCreateInput = {
    pet_name: petData.pet_name,
    avatar_background_color: resolveAvatarBackgroundColor(
      petData.avatar_background_color,
    ),
    gender: petData.gender,
    weight: petData.weight,
    birth_date: petData.birth_date ? new Date(petData.birth_date) : null,
    user: { connect: { id: userId } },
    species: { connect: { id: petData.species_id } },
    ...(petData.breed_id && { breeds: { connect: { id: petData.breed_id } } }),
  }

  const newPet = await petRepository.create(data)

  // Auto-create initial weight log — new pet has no prior logs, no conflict possible
  if (petData.weight != null) {
    await healthLogRepository.create({
      pet_id: newPet.id,
      created_by_user_id: userId,
      category: 'WEIGHT' as HealthLogCategory,
      description: 'บันทึกน้ำหนักเริ่มต้น',
      weight: petData.weight,
    })
  }

  return newPet
}

export const createMultiplePets = async (
  userId: string,
  petsData: PetCreationData[],
) => {
  if (petsData.length === 0) {
    throw new BadRequestError('At least one pet is required.')
  }

  if (petsData.length > 30) {
    throw new BadRequestError('Cannot create more than 30 pets at once.')
  }

  const currentPetCount = await petRepository.countByUserId(userId)
  const totalPetCount = currentPetCount + petsData.length

  if (totalPetCount > 30) {
    throw new ConflictError(
      `You can only add ${30 - currentPetCount} more pet(s). You have reached the maximum limit of 30 pets.`,
    )
  }

  const normalizedToDisplayName = new Map<string, string>()
  const normalizedIncomingNames = petsData.map((pet) => {
    const normalized = normalizePetNameForComparison(pet.pet_name)
    if (!normalizedToDisplayName.has(normalized)) {
      normalizedToDisplayName.set(normalized, pet.pet_name.trim())
    }
    return normalized
  })

  const duplicateNamesInPayload = getDuplicateNormalizedNames(
    normalizedIncomingNames,
  )
  if (duplicateNamesInPayload.length > 0) {
    const duplicateNamesText = duplicateNamesInPayload
      .map((name) => `"${normalizedToDisplayName.get(name)}"`)
      .join(', ')

    throw new ConflictError(
      `Duplicate active pet names in request: ${duplicateNamesText}. Please use unique names for each active pet.`,
    )
  }

  const existingActivePets =
    await petRepository.findActivePetNamesByUserId(userId)
  const existingNormalizedNames = new Set(
    existingActivePets.map((pet) =>
      normalizePetNameForComparison(pet.pet_name),
    ),
  )

  const conflictingNames = [
    ...new Set(
      normalizedIncomingNames.filter((name) =>
        existingNormalizedNames.has(name),
      ),
    ),
  ]

  if (conflictingNames.length > 0) {
    const conflictingNamesText = conflictingNames
      .map((name) => `"${normalizedToDisplayName.get(name)}"`)
      .join(', ')

    throw new ConflictError(
      `You already have active pet(s) named: ${conflictingNamesText}. Please choose different name(s).`,
    )
  }

  // Batch weight validation — runs before the transaction so no partial writes occur.
  // Fetches all unique species in one query then validates each pet.
  // If any pet's weight is impossible, the ENTIRE batch is rejected.
  const petsWithWeight = petsData.filter((p) => p.weight != null)
  if (petsWithWeight.length > 0) {
    const uniqueSpeciesIds = [...new Set(petsData.map((p) => p.species_id))]
    const speciesList = await prisma.species.findMany({
      where: { id: { in: uniqueSpeciesIds } },
      select: { id: true, name: true },
    })
    const speciesNameById = new Map(speciesList.map((s) => [s.id, s.name]))

    for (let i = 0; i < petsData.length; i++) {
      const petData = petsData[i]
      if (petData.weight == null) continue

      const speciesName = speciesNameById.get(petData.species_id) ?? 'DEFAULT'
      if (exceedsSpeciesMaxWeight(petData.weight, speciesName)) {
        const maxKg = getSpeciesMaxWeightKg(speciesName)
        throw new BadRequestError(
          `สัตว์เลี้ยงตัวที่ ${i + 1} ("${petData.pet_name}"): น้ำหนักที่ระบุ (${petData.weight.toFixed(2)} kg) เกินค่าสูงสุดที่เป็นไปได้สำหรับสัตว์เลี้ยงประเภทนี้ (สูงสุด ${maxKg} kg)`
        )
      }
    }
  }

  // Create all pets in a transaction
  const createdPets = await prisma.$transaction(async (tx) => {
    const pets = []
    for (const petData of petsData) {
      const data: Prisma.petsCreateInput = {
        pet_name: petData.pet_name,
        avatar_background_color: resolveAvatarBackgroundColor(
          petData.avatar_background_color,
        ),
        gender: petData.gender,
        weight: petData.weight,
        birth_date: petData.birth_date ? new Date(petData.birth_date) : null,
        user: { connect: { id: userId } },
        species: { connect: { id: petData.species_id } },
        ...(petData.breed_id && {
          breeds: { connect: { id: petData.breed_id } },
        }),
      }

      const newPet = await tx.pets.create({ data })
      pets.push(newPet)
    }
    return pets
  })

  // Auto-create initial weight logs for pets that had a weight specified.
  // New pets have no prior logs — no same-day conflict possible — create directly in parallel.
  await Promise.all(
    createdPets
      .map((newPet, i) => {
        const weight = petsData[i].weight
        if (weight == null) return null
        return healthLogRepository.create({
          pet_id: newPet.id,
          created_by_user_id: userId,
          category: 'WEIGHT' as HealthLogCategory,
          description: 'บันทึกน้ำหนักเริ่มต้น',
          weight,
        })
      })
      .filter((p): p is Promise<any> => p !== null)
  )

  return Promise.all(createdPets.map(formatPetProfile))
}

export const updatePet = async (
  petId: string,
  userId: string,
  petData: PetUpdatePayload,
) => {
  const existingPet = await petRepository.findPetProfileByPetId(petId, userId)
  if (!existingPet) {
    throw new NotFoundError('Pet not found or does not belong to this user.')
  }

  // Block updates for deleted pets
  if (existingPet.status === pet_status.DELETED) {
    throw new BadRequestError('Cannot update a deleted pet.')
  }

  // Block updates for deceased pets
  if (existingPet.status === pet_status.DECEASED) {
    throw new BadRequestError('Cannot update a deceased pet.')
  }

  const updateData: Prisma.petsUpdateInput = {}

  if (petData.pet_name != null) {
    await assertUniqueActivePetName(userId, petData.pet_name, petId)
    updateData.pet_name = petData.pet_name
  }
  if (petData.avatar_background_color !== undefined) {
    updateData.avatar_background_color = resolveAvatarBackgroundColor(
      petData.avatar_background_color,
    )
  }
  if (petData.gender != null) {
    updateData.gender = petData.gender
  }

  // ─── Weight: validate → conflict check → conditionally update ───────────────
  let weightConflict = false
  let todayWeightLog: Awaited<ReturnType<typeof healthLogRepository.findWeightLogByDate>> | null = null

  if (petData.weight != null) {
    // 1. Hard block: species absolute max
    const speciesName = existingPet.species?.name ?? 'DEFAULT'
    if (exceedsSpeciesMaxWeight(petData.weight, speciesName)) {
      const maxKg = getSpeciesMaxWeightKg(speciesName)
      throw new BadRequestError(
        `น้ำหนักที่ระบุ (${petData.weight.toFixed(2)} kg) เกินค่าสูงสุดที่เป็นไปได้สำหรับ${existingPet.species?.name_th ? ' ' + existingPet.species.name_th : 'สัตว์เลี้ยงประเภทนี้'} (สูงสุด ${maxKg} kg) กรุณาตรวจสอบอีกครั้ง`
      )
    }

    // 2. Same-day weight log conflict check
    todayWeightLog = await healthLogRepository.findWeightLogByDate(petId, new Date())
    const hasConflict = todayWeightLog !== null && !petData.overwriteWeightLog

    if (hasConflict) {
      // Hold weight — do not add to updateData; non-weight fields still update
      weightConflict = true
    } else {
      updateData.weight = petData.weight
    }
  }

  if (petData.birth_date != null) {
    updateData.birth_date = petData.birth_date
      ? new Date(petData.birth_date)
      : null
  }
  if (petData.species_id != null) {
    updateData.species = { connect: { id: petData.species_id } }
  }
  if (petData.breed_id != null) {
    updateData.breeds = { connect: { id: petData.breed_id } }
  }

  // Allow empty updateData when weight was intentionally held due to conflict
  if (Object.keys(updateData).length === 0 && !weightConflict) {
    throw new BadRequestError(
      'Request body must contain at least one valid field to update.',
    )
  }

  // Write non-weight fields (and weight if no conflict)
  if (Object.keys(updateData).length > 0) {
    await petRepository.update(petId, userId, updateData)
  }

  // ─── Auto weight log side-effects ───────────────────────────────────────────
  if (petData.weight != null && !weightConflict) {
    if (todayWeightLog) {
      // Overwrite confirmed: use the same upsert function as health-log-service,
      // updating logged_at to now so this becomes the latest entry for the day
      await healthLogRepository.updateWeightLogWithWeight(
        todayWeightLog.id,
        petData.weight,
        'อัปเดตน้ำหนักจากโปรไฟล์',
        undefined,
        new Date()
      )
    } else {
      // No conflict: auto-create a new weight log for today
      await healthLogRepository.create({
        pet_id: petId,
        created_by_user_id: userId,
        category: 'WEIGHT' as HealthLogCategory,
        description: 'อัปเดตน้ำหนักจากโปรไฟล์',
        weight: petData.weight,
      })
    }
  }

  // ─── Return ─────────────────────────────────────────────────────────────────
  const updatedPet = await getPetProfileById(petId, userId)

  if (weightConflict) {
    // Determine which non-weight fields were actually different from the existing values.
    // Frontend always sends all non-null fields, so comparing against existingPet is accurate.
    const changedFields: string[] = []
    if (petData.pet_name != null && petData.pet_name !== existingPet.pet_name)
      changedFields.push('ชื่อ')
    if (petData.gender != null && petData.gender !== existingPet.gender)
      changedFields.push('เพศ')
    if (petData.breed_id != null && petData.breed_id !== existingPet.breed_id)
      changedFields.push('สายพันธุ์')
    if (petData.species_id != null && petData.species_id !== existingPet.species_id)
      changedFields.push('ชนิดสัตว์')
    if (
      petData.birth_date != null &&
      new Date(petData.birth_date).getTime() !==
      (existingPet.birth_date ? new Date(existingPet.birth_date).getTime() : NaN)
    )
      changedFields.push('วันเกิด')
    if (
      petData.avatar_background_color !== undefined &&
      petData.avatar_background_color !== existingPet.avatar_background_color
    )
      changedFields.push('สีโปรไฟล์')

    const savedSummary =
      changedFields.length > 0
        ? `บันทึก${changedFields.join(', ')}สำเร็จ — `
        : ''

    return {
      conflict: true as const,
      message: `${savedSummary}มีการบันทึกน้ำหนักในวันนี้แล้ว คุณยังต้องการอัปเดตน้ำหนักอยู่หรือไม่?`,
      updatedFields: changedFields,
      pet: updatedPet,
    }
  }

  return { conflict: false as const, pet: updatedPet }
}

export const getAllPetProfilesForUser = async (
  userId: string,
  status?: pet_status,
) => {
  const resolvedStatus = status ?? pet_status.ACTIVE
  const ownedPets = (
    await petRepository.findAllPetProfilesByUserId(userId, resolvedStatus)
  ).map((pet) => ({ ...pet, petRole: 'OWNER' }))

  // For ACTIVE pets, also include pets shared with this user as a caregiver
  let allPets = ownedPets ?? []
  if (resolvedStatus === pet_status.ACTIVE) {
    const sharedPets = (
      await sharingRepository.findSharedActivePetsByUserId(userId)
    ).map((pet) => ({ ...pet, petRole: 'CAREGIVER' }))

    allPets = [...allPets, ...sharedPets]
  }

  if (allPets.length === 0) {
    return []
  }

  return Promise.all(allPets.map(formatPetProfile))
}

export const getPetProfileById = async (petId: string, userId: string) => {
  // Allow owner OR active caregiver
  const canAccess = await sharingRepository.canAccessPet(petId, userId)
  if (!canAccess) {
    throw new NotFoundError('Pet not found or access denied.')
  }

  const ownedPet = await petRepository.findPetProfileByPetId(petId, userId)
  if (ownedPet) {
    return formatPetProfile({ ...ownedPet, petRole: 'OWNER' })
  }

  const pet = await petRepository.findPetProfileByIdOnly(petId)
  if (!pet) throw new NotFoundError('Pet not found.')

  return formatPetProfile({ ...pet, petRole: 'CAREGIVER' })
}

/**
 * Update pet profile picture
 * @param petId - Pet ID
 * @param userId - User ID (for authorization)
 * @param objectKey - MinIO object key for the new profile image
 */
export const updatePetProfileImage = async (
  petId: string,
  userId: string,
  objectKey: string,
) => {
  const existingPet = await petRepository.findPetProfileByPetId(petId, userId)
  if (!existingPet) {
    throw new NotFoundError('Pet not found or does not belong to this user.')
  }

  // Enforce objectKey to match the expected pet profile image namespace.
  assertPetProfileObjectKey(objectKey, userId, petId)

  // Delete old profile image if it exists
  if (existingPet.profile_image_key) {
    try {
      await deleteFile(existingPet.profile_image_key)
    } catch (error) {
      // Log but don't fail if old image deletion fails
      console.error('Failed to delete old profile image:', error)
    }
  }

  // Update with new profile image key
  const updateData: Prisma.petsUpdateInput = {
    profile_image_key: objectKey,
  }

  await petRepository.update(petId, userId, updateData)

  return getPetProfileById(petId, userId)
}

/**
 * Delete pet profile picture
 * @param petId - Pet ID
 * @param userId - User ID (for authorization)
 */
export const deletePetProfileImage = async (petId: string, userId: string) => {
  const existingPet = await petRepository.findPetProfileByPetId(petId, userId)
  if (!existingPet) {
    throw new NotFoundError('Pet not found or does not belong to this user.')
  }

  if (!existingPet.profile_image_key) {
    throw new BadRequestError('Pet does not have a profile image.')
  }

  // Delete from MinIO
  await deleteFile(existingPet.profile_image_key)

  // Remove from database
  const updateData: Prisma.petsUpdateInput = {
    profile_image_key: null,
  }

  await petRepository.update(petId, userId, updateData)

  return getPetProfileById(petId, userId)
}

// ==========================================
// Pet Deletion & Deceased Logic
// ==========================================

/**
 * Cancel all active reminders, recurrence templates, and pending notifications for a pet.
 * Used by both soft-delete and mark-as-deceased flows.
 */
const cancelAllRemindersForPet = async (petId: string) => {
  await prisma.$transaction(async (tx) => {
    // 1. Cancel all to_do and overdue reminders for this pet
    await tx.reminders.updateMany({
      where: {
        pet_id: petId,
        reminder_status: {
          in: [reminder_status.to_do, reminder_status.overdue],
        },
      },
      data: {
        reminder_status: reminder_status.cancelled,
      },
    })

    // 2. Cancel all active recurrence templates linked to this pet's reminders
    const recurrenceIds = await tx.reminders.findMany({
      where: { pet_id: petId, recurrence_id: { not: null } },
      select: { recurrence_id: true },
      distinct: ['recurrence_id'],
    })

    const uniqueRecurrenceIds = recurrenceIds
      .map((r) => r.recurrence_id)
      .filter((id): id is string => id !== null)

    if (uniqueRecurrenceIds.length > 0) {
      await tx.recurrence.updateMany({
        where: {
          id: { in: uniqueRecurrenceIds },
          recurrence_status: RecurrenceStatusEnum.ACTIVE,
        },
        data: {
          recurrence_status: RecurrenceStatusEnum.CANCELLED,
        },
      })
    }

    // 3. Cancel all pending notifications for this pet's reminders
    const reminderIds = await tx.reminders.findMany({
      where: { pet_id: petId },
      select: { id: true },
    })

    const reminderIdList = reminderIds.map((r) => r.id)

    if (reminderIdList.length > 0) {
      await tx.notifications.updateMany({
        where: {
          reminder_id: { in: reminderIdList },
          status: notification_status.pending,
        },
        data: {
          status: notification_status.failed,
        },
      })
    }

    // 4. Also cancel pending notifications directly linked to this pet
    await tx.notifications.updateMany({
      where: {
        pet_id: petId,
        status: notification_status.pending,
      },
      data: {
        status: notification_status.failed,
      },
    })
  })
}

/**
 * Soft-delete or mark-as-deceased based on the reason.
 * - JUST_DELETE: blocked if last active pet, sets status to DELETED
 * - DECEASED: always allowed, sets status to DECEASED
 */
export const softDeletePet = async (
  petId: string,
  userId: string,
  reason: 'JUST_DELETE' | 'DECEASED',
  deceasedDate?: string | null,
) => {
  const existingPet = await petRepository.findPetProfileByPetId(petId, userId)
  if (!existingPet) {
    throw new NotFoundError('Pet not found or does not belong to this user.')
  }

  if (existingPet.status !== pet_status.ACTIVE) {
    throw new BadRequestError(
      'Only active pets can be deleted or marked as deceased.',
    )
  }

  if (reason === 'DECEASED') {
    // Mark as deceased — always allowed even for last pet
    const parsedDate = deceasedDate ? new Date(deceasedDate) : new Date()
    await petRepository.markAsDeceased(petId, userId, parsedDate)
    await cancelAllRemindersForPet(petId)
    return { message: 'Pet has been marked as deceased.', status: 'DECEASED' }
  }

  // JUST_DELETE — block if last active pet (including shared pets)
  const ownedActivePets = await petRepository.countActivePetsByUserId(userId)
  const sharedActivePets =
    await sharingRepository.countSharedActivePetsByUserId(userId)
  const totalActivePets = ownedActivePets + sharedActivePets

  if (totalActivePets <= 1) {
    throw new BadRequestError(
      'Cannot delete your last active pet. You must have at least one active pet.',
    )
  }

  await petRepository.softDeletePet(petId, userId, reason)
  await cancelAllRemindersForPet(petId)
  return {
    message:
      'Pet has been deleted. It will be permanently removed after 30 days.',
    status: 'DELETED',
  }
}

/**
 * Get past (deceased) pets for a user.
 * Includes shared deceased pets the user has/had caregiver access to.
 */
export const getPastPets = async (userId: string) => {
  const ownedDeceased = (
    await petRepository.findAllPetProfilesByUserId(userId, pet_status.DECEASED)
  ).map((pet) => ({ ...pet, petRole: 'OWNER' }))
  const sharedDeceased = (
    await sharingRepository.findSharedDeceasedPetsByUserId(userId)
  ).map((pet) => ({ ...pet, petRole: 'CAREGIVER' }))

  const allDeceased = [...(ownedDeceased ?? []), ...sharedDeceased]
  if (allDeceased.length === 0) return []
  return Promise.all(allDeceased.map(formatPetProfile))
}

/**
 * Get recently deleted pets (within 30 days) for a user.
 */
export const getRecentlyDeletedPets = async (userId: string) => {
  const pets = await petRepository.findRecentlyDeletedPets(userId)
  if (!pets || pets.length === 0) return []
  return Promise.all(pets.map(formatPetProfile))
}

/**
 * Restore a soft-deleted pet back to ACTIVE status.
 * Only works on pets with status = DELETED.
 */
export const restorePet = async (petId: string, userId: string) => {
  const existingPet = await petRepository.findPetProfileByPetId(petId, userId)
  if (!existingPet) {
    throw new NotFoundError('Pet not found or does not belong to this user.')
  }

  if (existingPet.status !== pet_status.DELETED) {
    throw new BadRequestError('Only soft-deleted pets can be restored.')
  }

  // Restoring creates an ACTIVE pet, so it must not duplicate any existing ACTIVE owner pet name.
  await assertUniqueActivePetName(userId, existingPet.pet_name, petId)

  // Check if user already has 30 active pets (owned + shared from other users)
  const ownedActivePets = await petRepository.countActivePetsByUserId(userId)
  const sharedActivePets =
    await sharingRepository.countSharedActivePetsByUserId(userId)
  const totalActivePets = ownedActivePets + sharedActivePets

  if (totalActivePets >= 30) {
    throw new ConflictError(
      'Cannot restore pet. You have reached the maximum limit of 30 active pets.',
    )
  }

  await petRepository.restorePet(petId, userId)
  return { message: 'Pet has been restored successfully.', status: 'ACTIVE' }
}

/**
 * Permanently delete a soft-deleted pet immediately (skip 30-day wait).
 * Only works on pets with status = DELETED.
 */
export const permanentDeletePet = async (petId: string, userId: string) => {
  const existingPet = await petRepository.findPetProfileByPetId(petId, userId)
  if (!existingPet) {
    throw new NotFoundError('Pet not found or does not belong to this user.')
  }

  if (existingPet.status !== pet_status.DELETED) {
    throw new BadRequestError(
      'Only soft-deleted pets can be permanently deleted.',
    )
  }

  // Delete profile image from MinIO if it exists
  if (existingPet.profile_image_key) {
    try {
      await deleteFile(existingPet.profile_image_key)
    } catch (error) {
      console.error(
        'Failed to delete profile image during permanent delete:',
        error,
      )
    }
  }

  // Hard delete (cascade removes reminders & notifications)
  await petRepository.hardDeletePet(petId)
  return { message: 'Pet has been permanently deleted.' }
}
