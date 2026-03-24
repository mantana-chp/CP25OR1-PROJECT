import * as healthLogRepository from './health-log-repository'
import { toDto } from './health-log-mapper'
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ApiError
} from '../../shared/errors'
import { canAccessPet } from '../pet-sharing/pet-sharing-repository'
import prisma from '../../libs/db'
import { HealthLogDto, CreateHealthLogInput } from './health-log-types'
import { Prisma } from '../../generated/prisma/client'
import { UpdateHealthLogPayload } from './health-log-schema'

const validateLoggedAt = (loggedAt?: Date) => {
  if (!loggedAt) return

  const timestamp = loggedAt.getTime()
  if (Number.isNaN(timestamp)) {
    throw new BadRequestError('Invalid loggedAt date')
  }

  // Allow small clock skew between client and server.
  const nowWithTolerance = Date.now() + 5 * 60 * 1000
  if (timestamp > nowWithTolerance) {
    throw new BadRequestError('loggedAt cannot be in the future')
  }
}

/**
 * Helper to determine the createdBy display value
 */
const resolveCreatedBy = async (
  creatorId: string,
  ownerId: string,
  viewerId: string
): Promise<string> => {
  // If viewer is the creator
  if (creatorId === viewerId) {
    return 'คุณ'; // You
  }

  // If creator is the owner
  if (creatorId === ownerId) {
    return 'เจ้าของสัตว์เลี้ยง'; // Pet Owner
  }

  // Creator is a caregiver, look up their alias
  const contact = await prisma.owner_caregiver_contacts.findUnique({
    where: {
      owner_user_id_caregiver_user_id: {
        owner_user_id: ownerId,
        caregiver_user_id: creatorId
      }
    },
    select: { alias: true }
  })

  return contact?.alias ?? 'ผู้ดูแล' // Caregiver's alias or fallback "Caregiver"
}

/**
 * Create a new health log for a pet.
 * If category is WEIGHT and weight is provided, also update the pet's current weight.
 */
export const createHealthLog = async (
  petId: string,
  userId: string,
  input: CreateHealthLogInput
): Promise<HealthLogDto> => {
  validateLoggedAt(input.loggedAt)

  // 1. Validate access
  const hasAccess = await canAccessPet(petId, userId)
  if (!hasAccess) {
    throw new BadRequestError('Access denied to this pet')
  }

  // 2. Get pet owner ID
  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { user_id: true },
  });

  if (!pet) {
    throw new NotFoundError('Pet not found');
  }

  // 3. Create health log and optionally update pet weight in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the health log
    const healthLog = await tx.health_logs.create({
      data: {
        pet_id: petId,
        created_by_user_id: userId,
        category: input.category,
        description: input.description,
        weight: input.weight ? new Prisma.Decimal(input.weight) : null,
        note: input.note || null,
        logged_at: input.loggedAt || undefined
      },
      include: {
        created_by: {
          select: {
            id: true,
            current_installation_id: true,
          },
        },
      },
    });

    // Only update pet's weight if category is WEIGHT and weight is provided
    if (input.category === 'WEIGHT' && input.weight !== undefined && input.weight !== null) {
      await tx.pets.update({
        where: { id: petId },
        data: {
          weight: new Prisma.Decimal(input.weight),
        },
      });
    }

    return healthLog;
  });

  // 4. Resolve createdBy display value
  const createdBy = await resolveCreatedBy(userId, pet.user_id, userId);

  return toDto(result, createdBy);
};

/**
 * Get all health logs for a pet.
 */
export const getHealthLogs = async (
  petId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ logs: HealthLogDto[]; total: number }> => {
  // 1. Validate access
  const hasAccess = await canAccessPet(petId, userId);
  if (!hasAccess) {
    throw new BadRequestError('Access denied to this pet');
  }

  // 2. Get pet owner ID
  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { user_id: true },
  });

  if (!pet) {
    throw new NotFoundError('Pet not found')
  }

  // 3. Fetch logs
  const [logs, total] = await Promise.all([
    healthLogRepository.findByPetId(petId, limit, offset),
    healthLogRepository.countByPetId(petId)
  ])

  // 4. Resolve createdBy for each log
  const logsWithCreatedBy = await Promise.all(
    logs.map(async (log) => {
      const createdBy = await resolveCreatedBy(
        log.created_by_user_id,
        pet.user_id,
        userId
      )
      return toDto(log, createdBy)
    })
  )

  return {
    logs: logsWithCreatedBy,
    total
  }
}

/**
 * Get a single health log by ID.
 */
export const getHealthLogById = async (
  logId: string,
  petId: string,
  userId: string
): Promise<HealthLogDto> => {
  const log = await healthLogRepository.findById(logId)

  if (!log) {
    throw new NotFoundError('Health log not found')
  }

  // Verify the log belongs to the specified pet
  if (log.pet_id !== petId) {
    throw new NotFoundError('Health log not found')
  }

  // Verify access to the pet
  const hasAccess = await canAccessPet(petId, userId)
  if (!hasAccess) {
    throw new NotFoundError('Health log not found')
  }

  // Get pet owner ID for createdBy resolution
  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { user_id: true }
  })

  if (!pet) {
    throw new NotFoundError('Pet not found')
  }

  // Resolve createdBy display value
  const createdBy = await resolveCreatedBy(
    log.created_by_user_id,
    pet.user_id,
    userId
  )

  return toDto(log, createdBy)
}

/**
 * Update a health log.
 * Owners can edit any log, caregivers can only edit logs they created.
 */
export const updateHealthLog = async (
  logId: string,
  petId: string,
  userId: string,
  updateData: UpdateHealthLogPayload
): Promise<HealthLogDto> => {
  validateLoggedAt(updateData.loggedAt)

  const log = await healthLogRepository.findById(logId)

  if (!log) {
    throw new NotFoundError('Health log not found')
  }

  // Verify the log belongs to the specified pet
  if (log.pet_id !== petId) {
    throw new NotFoundError('Health log not found')
  }

  // Verify access to the pet
  const hasAccess = await canAccessPet(petId, userId)
  if (!hasAccess) {
    throw new ApiError('Forbidden', 403, [
      { message: 'Access to this pet denied' }
    ])
  }

  // Check if user is owner or creator
  // Owners can edit any log; caregivers can only edit logs they created
  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { user_id: true }
  })

  if (!pet) {
    throw new NotFoundError('Pet not found')
  }

  const isPetOwner = pet.user_id === userId
  if (!isPetOwner) {
    const creatorId = log.created_by_user_id
    if (creatorId !== userId) {
      throw new ApiError('Forbidden', 403, [
        {
          message:
            'Caregivers can only update health logs they created themselves'
        }
      ])
    }
  }

  // Determine the category (use updated value or fallback to existing)
  const finalCategory = updateData.category || log.category

  // Update in transaction if weight needs to be updated
  let updatedLog

  if (updateData.weight !== undefined) {
    // Weight is provided, update both log and pet's weight (if category is WEIGHT)
    updatedLog = await prisma.$transaction(async (tx) => {
      // Update the health log
      const updated = await tx.health_logs.update({
        where: { id: logId },
        data: {
          category: updateData.category,
          description: updateData.description,
          weight: new Prisma.Decimal(updateData.weight!),
          note: updateData.note,
          logged_at: updateData.loggedAt
        },
        include: {
          created_by: {
            select: {
              id: true,
              current_installation_id: true
            }
          }
        }
      })

      // Only update the pet's weight if the final category is WEIGHT
      if (finalCategory === 'WEIGHT') {
        await tx.pets.update({
          where: { id: petId },
          data: {
            weight: new Prisma.Decimal(updateData.weight!)
          }
        })
      }

      return updated
    })
  } else {
    // Weight not provided, just update category/description/note
    updatedLog = await prisma.health_logs.update({
      where: { id: logId },
      data: {
        category: updateData.category,
        description: updateData.description,
        note: updateData.note,
        logged_at: updateData.loggedAt
      },
      include: {
        created_by: {
          select: {
            id: true,
            current_installation_id: true
          }
        }
      }
    })
  }

  // Resolve createdBy display value
  const createdBy = await resolveCreatedBy(
    updatedLog.created_by_user_id,
    pet.user_id,
    userId
  )

  return toDto(updatedLog, createdBy)
}

/**
 * Delete a health log.
 * Owners can delete any log, caregivers can only delete logs they created.
 */
export const deleteHealthLog = async (
  logId: string,
  petId: string,
  userId: string
): Promise<void> => {
  const log = await healthLogRepository.findById(logId)

  if (!log) {
    throw new NotFoundError('Health log not found')
  }

  // Verify the log belongs to the specified pet
  if (log.pet_id !== petId) {
    throw new NotFoundError('Health log not found')
  }

  // Verify access to the pet
  const hasAccess = await canAccessPet(petId, userId)
  if (!hasAccess) {
    throw new ApiError('Forbidden', 403, [
      { message: 'Access to this pet denied' }
    ])
  }

  // Check if user is owner or creator
  // Owners can delete any log; caregivers can only delete logs they created
  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { user_id: true }
  })

  if (!pet) {
    throw new NotFoundError('Pet not found')
  }

  const isPetOwner = pet.user_id === userId
  if (!isPetOwner) {
    const creatorId = log.created_by_user_id
    if (creatorId !== userId) {
      throw new ApiError('Forbidden', 403, [
        {
          message:
            'Caregivers can only delete health logs they created themselves'
        }
      ])
    }
  }

  await healthLogRepository.deleteById(logId)
}
