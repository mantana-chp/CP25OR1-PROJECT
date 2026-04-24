import prisma from '../../libs/db'
import { Prisma, pet_status } from '../../generated/prisma/client'

const petProfileSelect = {
  id: true,
  pet_name: true,
  avatar_background_color: true,
  gender: true,
  birth_date: true,
  weight: true,
  species_id: true,
  breed_id: true,
  profile_image_key: true,
  status: true,
  deceased_date: true,
  deleted_at: true,
  deletion_reason: true,
  species: {
    select: {
      name: true,
      name_th: true,
    },
  },
  breeds: {
    select: {
      name_th: true,
    },
  },
}

export const create = async (data: Prisma.petsCreateInput) => {
  return await prisma.pets.create({
    data,
  })
}

/** Count only ACTIVE pets for the 10-pet limit */
export const countByUserId = async (userId: string): Promise<number> => {
  return await prisma.pets.count({
    where: { user_id: userId, status: pet_status.ACTIVE },
  })
}

/** Count active pets (used for last-pet guard) */
export const countActivePetsByUserId = async (
  userId: string,
): Promise<number> => {
  return await prisma.pets.count({
    where: { user_id: userId, status: pet_status.ACTIVE },
  })
}

/** Get active pet names for a user (optionally excluding one pet ID). */
export const findActivePetNamesByUserId = async (
  userId: string,
  excludePetId?: string,
) => {
  return await prisma.pets.findMany({
    where: {
      user_id: userId,
      status: pet_status.ACTIVE,
      deleted_at: null,
      ...(excludePetId ? { id: { not: excludePetId } } : {}),
    },
    select: {
      id: true,
      pet_name: true,
    },
  });
};

/** Get pets filtered by status */
export const findAllPetProfilesByUserId = async (
  userId: string,
  status?: pet_status,
) => {
  return await prisma.pets.findMany({
    where: {
      user_id: userId,
      ...(status ? { status } : {}),
    },
    select: petProfileSelect,
    orderBy: {
      created_at: 'asc',
    },
  })
}

/** Get recently deleted pets (deleted within 30 days) */
export const findRecentlyDeletedPets = async (userId: string) => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  return await prisma.pets.findMany({
    where: {
      user_id: userId,
      status: pet_status.DELETED,
      deleted_at: { gte: thirtyDaysAgo },
    },
    select: petProfileSelect,
    orderBy: {
      deleted_at: 'desc',
    },
  })
}

export const findPetProfileByPetId = async (petId: string, userId: string) => {
  return await prisma.pets.findFirst({
    where: {
      id: petId,
      user_id: userId,
    },
    select: petProfileSelect,
  })
}

/** Fetch a pet by ID alone (no ownership filter). Used after access has been verified externally. */
export const findPetProfileByIdOnly = async (petId: string) => {
  return await prisma.pets.findUnique({
    where: { id: petId },
    select: petProfileSelect,
  })
}

export const update = async (
  petId: string,
  userId: string,
  data: Prisma.petsUpdateInput,
) => {
  return await prisma.pets.update({
    where: {
      id: petId,
      user_id: userId,
    },
    data,
  })
}

/** Soft delete: set status to DELETED with timestamp and reason */
export const softDeletePet = async (
  petId: string,
  userId: string,
  reason: 'JUST_DELETE' | 'DECEASED',
) => {
  return await prisma.pets.update({
    where: { id: petId, user_id: userId },
    data: {
      status: pet_status.DELETED,
      deleted_at: new Date(),
      deletion_reason: reason,
    },
  })
}

/** Mark pet as deceased */
export const markAsDeceased = async (
  petId: string,
  userId: string,
  deceasedDate?: Date,
) => {
  return await prisma.pets.update({
    where: { id: petId, user_id: userId },
    data: {
      status: pet_status.DECEASED,
      deceased_date: deceasedDate ?? new Date(),
    },
  })
}

/** Find soft-deleted pets older than 30 days (for hard-delete cleanup job) */
export const findSoftDeletedPetsOlderThan = async (days: number) => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  return await prisma.pets.findMany({
    where: {
      status: pet_status.DELETED,
      deleted_at: { lte: cutoffDate },
    },
    select: {
      id: true,
      user_id: true,
      profile_image_key: true,
    },
  })
}

/** Hard delete a pet (cascade deletes reminders & notifications) */
export const hardDeletePet = async (petId: string) => {
  return await prisma.pets.delete({
    where: { id: petId },
  })
}

/** Restore a deleted pet back to active status */
export const restorePet = async (petId: string, userId: string) => {
  return await prisma.pets.update({
    where: { id: petId, user_id: userId },
    data: {
      status: pet_status.ACTIVE,
      deleted_at: null,
      deletion_reason: null,
    },
  })
}

/** Permanent delete - for user-initiated permanent deletion */
export const permanentDeletePet = async (petId: string, userId: string) => {
  return await prisma.pets.delete({
    where: {
      id: petId,
      user_id: userId,
    },
  })
}
