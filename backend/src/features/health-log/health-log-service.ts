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
import { HealthLogDto, CreateHealthLogInput, CreateHealthLogResult } from './health-log-types'
import { Prisma } from '../../generated/prisma/client'
import { UpdateHealthLogPayload } from './health-log-schema'
import { logger } from '../../libs/logger'
import * as healthInsightDetection from '../health-insights/health-insight-detection-service'
import * as healthInsightGeneration from '../health-insights/health-insight-generation-service'
import * as healthInsightRepository from '../health-insights/health-insight-repository'
import * as notificationService from '../notifications/notification-service'
import { getSeverityEmoji, getWeightThreshold } from '../health-insights/health-insight-types'

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
 * Multiplier applied to the species gain/loss threshold to get the hard rejection limit.
 * e.g. Dog gainPercent=15% → reject if gain >75% (regardless of time).
 */
const WEIGHT_REJECTION_MULTIPLIER = 5

/**
 * Species-aware, time-aware two-tier weight validity check.
 *
 * Soft (suspicious): species threshold scaled by daysSince/windowDays, floored at 10%.
 * Hard (impossible): species threshold × WEIGHT_REJECTION_MULTIPLIER, NOT time-scaled.
 */
const checkWeightValidity = (
  newWeight: number,
  previousWeight: number,
  daysSince: number,
  speciesName: string
): { suspicious: boolean; impossible: boolean; changePercent: number } => {
  const rawChange = ((newWeight - previousWeight) / previousWeight) * 100
  const changePercent = Math.abs(rawChange)
  const isGain = rawChange > 0

  const threshold = getWeightThreshold(speciesName)
  const limitPercent = isGain ? threshold.gainPercent : threshold.lossPercent

  // Soft: time-scaled, minimum 10% floor so short windows aren't overly strict
  const timeScale = Math.min(Math.max(daysSince, 1) / threshold.windowDays, 1.0)
  const warnThreshold = Math.max(10, limitPercent * timeScale)

  // Hard: absolute physiological limit, independent of time
  const rejectThreshold = limitPercent * WEIGHT_REJECTION_MULTIPLIER

  return {
    suspicious: changePercent > warnThreshold,
    impossible: changePercent > rejectThreshold,
    changePercent
  }
}

/**
 * Format warning message for suspicious weight change (Thai, friendly tone).
 */
const formatWeightWarningMessage = (
  previousWeight: number,
  previousDate: Date,
  newWeight: number
): string => {
  const dateStr = previousDate.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
  return `น้ำหนักเปลี่ยนแปลงค่อนข้างมากจากครั้งก่อน (จาก ${previousWeight.toFixed(2)} kg เมื่อ ${dateStr} เป็น ${newWeight.toFixed(2)} kg) กรุณาตรวจสอบความถูกต้องอีกครั้ง`
}

/**
 * Format rejection message for an impossible weight change (Thai).
 */
const formatWeightImpossibleMessage = (
  previousWeight: number,
  newWeight: number,
  changePercent: number
): string => {
  const dir = newWeight > previousWeight ? 'เพิ่มขึ้น' : 'ลดลง'
  return `น้ำหนักที่บันทึก (${newWeight.toFixed(2)} kg) ${dir}จากครั้งก่อน (${previousWeight.toFixed(2)} kg) มากผิดปกติ (${changePercent.toFixed(1)}%) กรุณาตรวจสอบค่าน้ำหนักที่บันทึกอีกครั้ง`
}

/**
 * Create a new health log for a pet.
 * If category is WEIGHT and weight is provided, also update the pet's current weight.
 * For WEIGHT category: throws ConflictError with conflict details if same-day log exists (unless upsert=true).
 */
export const createHealthLog = async (
  petId: string,
  userId: string,
  input: CreateHealthLogInput
): Promise<CreateHealthLogResult> => {
  validateLoggedAt(input.loggedAt)

  // 1. Validate access
  const hasAccess = await canAccessPet(petId, userId)
  if (!hasAccess) {
    throw new BadRequestError('Access denied to this pet')
  }

  // 2. Get pet owner ID
  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { user_id: true, species: { select: { name: true } } },
  });

  if (!pet) {
    throw new NotFoundError('Pet not found');
  }

  // ─── WEIGHT CATEGORY: Weight validation & same-day conflict detection ──────────

  let newLogSuspiciousChange: boolean | undefined
  let newLogWarningMessage: string | undefined

  if (input.category === 'WEIGHT' && input.weight !== undefined && input.weight !== null) {
    const logDate = input.loggedAt || new Date()
    const startOfDay = new Date(logDate)
    startOfDay.setHours(0, 0, 0, 0)
    const speciesName = pet.species?.name ?? 'DEFAULT'

    // Fetch both same-day log and historical log in parallel
    const [existingLog, previousWeightLog] = await Promise.all([
      healthLogRepository.findWeightLogByDate(petId, logDate),
      healthLogRepository.findMostRecentPreviousWeight(petId, startOfDay)
    ])

    // ── Step 1: Impossible check (always runs before any DB write) ────────────────
    // Compares against today's existing log first (most relevant for upsert);
    // falls back to the most recent historical log.
    const baselineLog = existingLog ?? previousWeightLog
    if (baselineLog && baselineLog.weight !== null) {
      const baselineWeight = Number(baselineLog.weight)
      // daysSince=0 for same-day; formula internally floors to 1 so thresholds stay meaningful
      const daysSince = existingLog
        ? 0
        : (startOfDay.getTime() - new Date(previousWeightLog!.logged_at).getTime()) / (1000 * 60 * 60 * 24)
      const validity = checkWeightValidity(input.weight, baselineWeight, daysSince, speciesName)

      if (validity.impossible) {
        throw new BadRequestError(
          formatWeightImpossibleMessage(baselineWeight, input.weight, validity.changePercent)
        )
      }
    }

    // ── Step 2: Suspicious warning check (historical trend only, before today) ─────
    if (previousWeightLog && previousWeightLog.weight !== null) {
      const previousWeight = Number(previousWeightLog.weight)
      const daysSince =
        (startOfDay.getTime() - new Date(previousWeightLog.logged_at).getTime()) / (1000 * 60 * 60 * 24)
      const validity = checkWeightValidity(input.weight, previousWeight, daysSince, speciesName)

      if (validity.suspicious) {
        newLogSuspiciousChange = true
        newLogWarningMessage = formatWeightWarningMessage(
          previousWeight,
          new Date(previousWeightLog.logged_at),
          input.weight
        )
        logger.warn(
          `[WeightLog] Suspicious weight change for pet ${petId}: ` +
          `${previousWeight}kg → ${input.weight}kg (${validity.changePercent.toFixed(1)}%, ${daysSince.toFixed(1)} days)`
        )
      }
    }

    // ── Step 3: Same-day conflict resolution ──────────────────────────────────────
    if (existingLog) {
      if (input.upsert) {
        // Upsert: overwrite existing same-day log (impossible check already passed above)
        const updatedLog = await healthLogRepository.updateWeightLogWithWeight(
          existingLog.id,
          input.weight,
          input.description,
          input.note,
          input.loggedAt
        )

        await prisma.pets.update({
          where: { id: petId },
          data: { weight: new Prisma.Decimal(input.weight) }
        })

        const createdBy = await resolveCreatedBy(userId, pet.user_id, userId)

        return {
          kind: 'created',
          log: toDto(updatedLog, createdBy),
          statusCode: 200,
          suspiciousChange: newLogSuspiciousChange,
          warningMessage: newLogWarningMessage
        }
      } else {
        // No upsert flag — ask the user first
        return { kind: 'conflict' }
      }
    }
    // No same-day conflict — fall through to create new log
    // (suspicious info already captured above)
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

  // 5. Check for immediate critical symptom alerts (fire-and-forget, non-blocking)
  if (input.category === 'SYMPTOMS') {
    setImmediate(async () => {
      try {
        logger.info(`[ImmediateAlert] Checking for critical symptoms in health log ${result.id}`);

        // Detect abnormal symptom
        const abnormalPattern = await healthInsightDetection.detectAbnormalSymptom(
          petId,
          result.id,
          input.description,
          result.logged_at
        );

        if (abnormalPattern) {
          logger.info(`[ImmediateAlert] Critical symptom detected for pet ${petId}: "${abnormalPattern.symptom}"`);

          // Get pet details for AI generation
          const petDetails = await prisma.pets.findUnique({
            where: { id: petId },
            include: {
              species: true,
              breeds: true,
            },
          });

          if (petDetails) {
            // Generate AI insight
            const aiInsight = await healthInsightGeneration.generateInsightWithAI({
              petName: petDetails.pet_name,
              species: petDetails.species.name,
              breed: petDetails.breeds?.name || null,
              pattern: abnormalPattern,
            });

            // Add severity emoji
            const titleWithEmoji = `${getSeverityEmoji(abnormalPattern.severity)} ${aiInsight.title.replace(/^[🚨⚠️💡ℹ️📌📝📋]\s*/, '')}`;

            // Save insight
            const savedInsight = await healthInsightRepository.create({
              pet_id: petId,
              insight_type: abnormalPattern.type,
              severity: abnormalPattern.severity,
              title: titleWithEmoji,
              description: aiInsight.description,
              context_data: abnormalPattern,
            });

            logger.info(`[ImmediateAlert] Created immediate insight ${savedInsight.id}`);

            // Send notifications immediately
            await notificationService.sendHealthInsightNotification(
              petId,
              savedInsight.id,
              titleWithEmoji,
              aiInsight.description
            );

            // Mark as notified
            await healthInsightRepository.markAsNotified(savedInsight.id);

            logger.info(`[ImmediateAlert] Immediate notification sent for insight ${savedInsight.id}`);
          }
        }
      } catch (error) {
        // Log but don't throw - this is fire-and-forget
        logger.error('[ImmediateAlert] Error processing immediate alert:', error as Error);
      }
    });
  }

  return {
    kind: 'created',
    log: toDto(result, createdBy),
    statusCode: 201,
    suspiciousChange: newLogSuspiciousChange,
    warningMessage: newLogWarningMessage
  }
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
