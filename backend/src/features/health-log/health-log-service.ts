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
import { HealthLogDto, CreateHealthLogInput, CreateHealthLogResult, UpdateHealthLogResult } from './health-log-types'
import { Prisma } from '../../generated/prisma/client'
import { UpdateHealthLogPayload } from './health-log-schema'
import { logger } from '../../libs/logger'
import * as healthInsightDetection from '../health-insights/health-insight-detection-service'
import * as healthInsightGeneration from '../health-insights/health-insight-generation-service'
import * as healthInsightRepository from '../health-insights/health-insight-repository'
import * as notificationService from '../notifications/notification-service'
import { getSeverityEmoji } from '../health-insights/health-insight-types'
import { THAI_MONTHS_SHORT } from '../../shared/constants'
import { exceedsSpeciesMaxWeight, getSpeciesMaxWeightKg, checkWeightValidity, formatWeightWarningMessage } from '../../shared/weight-validation'

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

const resolveCreatedBy = async (
  creatorId: string,
  ownerId: string,
  viewerId: string
): Promise<string> => {
  if (creatorId === viewerId) {
    return 'คุณ'
  }

  if (creatorId === ownerId) {
    return 'เจ้าของสัตว์เลี้ยง'
  }

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


const formatWeightImpossibleMessage = (
  previousWeight: number,
  newWeight: number,
  changePercent: number
): string => {
  const dir = newWeight > previousWeight ? 'เพิ่มขึ้น' : 'ลดลง'
  return `น้ำหนักที่บันทึก (${newWeight.toFixed(2)} kg) ${dir}จากครั้งก่อน (${previousWeight.toFixed(2)} kg) มากผิดปกติ (${changePercent.toFixed(1)}%) กรุณาตรวจสอบค่าน้ำหนักที่บันทึกอีกครั้ง`
}

export const createHealthLog = async (
  petId: string,
  userId: string,
  input: CreateHealthLogInput
): Promise<CreateHealthLogResult> => {
  validateLoggedAt(input.loggedAt)

  const hasAccess = await canAccessPet(petId, userId)
  if (!hasAccess) {
    throw new BadRequestError('Access denied to this pet')
  }

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

  const result = await prisma.$transaction(async (tx) => {
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

  const createdBy = await resolveCreatedBy(userId, pet.user_id, userId);

  // Fire-and-forget: detect critical symptoms and send immediate alert
  if (input.category === 'SYMPTOMS') {
    setImmediate(async () => {
      try {
        logger.info(`[ImmediateAlert] Checking for critical symptoms in health log ${result.id}`);

        const abnormalPattern = await healthInsightDetection.detectAbnormalSymptom(
          petId,
          result.id,
          input.description,
          result.logged_at
        );

        if (abnormalPattern) {
          logger.info(`[ImmediateAlert] Critical symptom detected for pet ${petId}: "${abnormalPattern.symptom}"`);

          const petDetails = await prisma.pets.findUnique({
            where: { id: petId },
            include: {
              species: true,
              breeds: true,
            },
          });

          if (petDetails) {
            const aiInsight = await healthInsightGeneration.generateInsightWithAI({
              petName: petDetails.pet_name,
              species: petDetails.species.name,
              breed: petDetails.breeds?.name || null,
              pattern: abnormalPattern,
            });

            const titleWithEmoji = `${getSeverityEmoji(abnormalPattern.severity)} ${aiInsight.title.replace(/^[🚨⚠️💡ℹ️📌📝📋]\s*/, '')}`;

            const savedInsight = await healthInsightRepository.create({
              pet_id: petId,
              insight_type: abnormalPattern.type,
              severity: abnormalPattern.severity,
              title: titleWithEmoji,
              description: aiInsight.description,
              context_data: abnormalPattern,
            });

            logger.info(`[ImmediateAlert] Created immediate insight ${savedInsight.id}`);

            await notificationService.sendHealthInsightNotification(
              petId,
              savedInsight.id,
              titleWithEmoji,
              aiInsight.description
            );

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

export const getHealthLogs = async (
  petId: string,
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ logs: HealthLogDto[]; total: number }> => {
  const hasAccess = await canAccessPet(petId, userId);
  if (!hasAccess) {
    throw new BadRequestError('Access denied to this pet');
  }

  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { user_id: true },
  });

  if (!pet) {
    throw new NotFoundError('Pet not found')
  }

  const [logs, total] = await Promise.all([
    healthLogRepository.findByPetId(petId, limit, offset),
    healthLogRepository.countByPetId(petId)
  ])

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

export const getHealthLogById = async (
  logId: string,
  petId: string,
  userId: string
): Promise<HealthLogDto> => {
  const log = await healthLogRepository.findById(logId)

  if (!log) {
    throw new NotFoundError('Health log not found')
  }

  if (log.pet_id !== petId) {
    throw new NotFoundError('Health log not found')
  }

  const hasAccess = await canAccessPet(petId, userId)
  if (!hasAccess) {
    throw new NotFoundError('Health log not found')
  }

  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { user_id: true }
  })

  if (!pet) {
    throw new NotFoundError('Pet not found')
  }

  const createdBy = await resolveCreatedBy(
    log.created_by_user_id,
    pet.user_id,
    userId
  )

  return toDto(log, createdBy)
}

export const updateHealthLog = async (
  logId: string,
  petId: string,
  userId: string,
  updateData: UpdateHealthLogPayload
): Promise<UpdateHealthLogResult> => {
  // loggedAt is immutable — not accepted in updateData, timestamp never changes after creation

  const log = await healthLogRepository.findById(logId)

  if (!log) {
    throw new NotFoundError('Health log not found')
  }

  if (log.pet_id !== petId) {
    throw new NotFoundError('Health log not found')
  }

  const hasAccess = await canAccessPet(petId, userId)
  if (!hasAccess) {
    throw new ApiError('Forbidden', 403, [
      { message: 'Access to this pet denied' }
    ])
  }

  // Caregivers can only edit logs they created
  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: {
      user_id: true,
      weight: true,
      species: { select: { name: true } }
    }
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

  const finalCategory = updateData.category || log.category

  // ─── Weight validation for WEIGHT edits ─────────────────────────────────────
  let suspiciousChange = false
  let warningMessage: string | undefined

  if (updateData.weight !== undefined && finalCategory === 'WEIGHT') {
    const speciesName = pet.species?.name ?? 'DEFAULT'

    // Hard block — biologically impossible value for this species
    if (exceedsSpeciesMaxWeight(updateData.weight, speciesName)) {
      const maxKg = getSpeciesMaxWeightKg(speciesName)
      throw new BadRequestError(
        `น้ำหนักที่ระบุ (${updateData.weight.toFixed(2)} kg) เกินค่าสูงสุดที่เป็นไปได้สำหรับสัตว์เลี้ยงประเภทนี้ (สูงสุด ${maxKg} kg) กรุณาตรวจสอบอีกครั้ง`
      )
    }

    // Soft warning — compare new value against the WEIGHT log immediately before this log’s timestamp
    // (log.logged_at is immutable, so it reliably identifies the log’s position in the history)
    const prevLog = await healthLogRepository.findMostRecentPreviousWeight(petId, log.logged_at)
    if (prevLog && prevLog.weight !== null) {
      // Normal case: a prior log exists — use it as the timed baseline
      const prevWeight = Number(prevLog.weight)
      const daysSince = Math.max(
        (log.logged_at.getTime() - prevLog.logged_at.getTime()) / (1000 * 60 * 60 * 24),
        0
      )
      const validity = checkWeightValidity(updateData.weight, prevWeight, daysSince, speciesName)
      if (validity.suspicious) {
        suspiciousChange = true
        warningMessage = formatWeightWarningMessage(prevWeight, prevLog.logged_at, updateData.weight)
      }
    } else if (pet.weight !== null) {
      // Fallback: first-ever log — compare against pets.weight (set when log was created).
      // daysSince=0 activates the 10% floor threshold, appropriate without a time reference.
      const prevWeight = Number(pet.weight)
      const validity = checkWeightValidity(updateData.weight, prevWeight, 0, speciesName)
      if (validity.suspicious) {
        suspiciousChange = true
        warningMessage = `น้ำหนักเปลี่ยนแปลงค่อนข้างมากจากน้ำหนักล่าสุดของสัตว์เลี้ยง (จาก ${prevWeight.toFixed(2)} kg เป็น ${updateData.weight.toFixed(2)} kg) กรุณาตรวจสอบความถูกต้องอีกครั้ง`
      }
    }
    // If both prevLog and pet.weight are null — brand new pet with no weight history at all — skip warning
  }

  // ─── Persist ────────────────────────────────────────────────────────────────
  let updatedLog

  if (updateData.weight !== undefined) {
    updatedLog = await prisma.$transaction(async (tx) => {
      const updated = await tx.health_logs.update({
        where: { id: logId },
        data: {
          category: updateData.category,
          description: updateData.description,
          weight: new Prisma.Decimal(updateData.weight!),
          note: updateData.note
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

      if (finalCategory === ‘WEIGHT’) {
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
    updatedLog = await prisma.health_logs.update({
      where: { id: logId },
      data: {
        category: updateData.category,
        description: updateData.description,
        note: updateData.note
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

  const createdBy = await resolveCreatedBy(
    updatedLog.created_by_user_id,
    pet.user_id,
    userId
  )

  return {
    log: toDto(updatedLog, createdBy),
    ...(suspiciousChange && { suspiciousChange: true, warningMessage })
  }
}

export const deleteHealthLog = async (
  logId: string,
  petId: string,
  userId: string
): Promise<void> => {
  const log = await healthLogRepository.findById(logId)

  if (!log) {
    throw new NotFoundError('Health log not found')
  }

  if (log.pet_id !== petId) {
    throw new NotFoundError('Health log not found')
  }

  const hasAccess = await canAccessPet(petId, userId)
  if (!hasAccess) {
    throw new ApiError('Forbidden', 403, [
      { message: 'Access to this pet denied' }
    ])
  }

  // Caregivers can only delete logs they created
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

// ─── Weight Chart ─────────────────────────────────────────────────────────────

// week=last 7 days, month=last 30 days, year=last 12 full calendar months (anchored to given date)
const getChartDateRange = (
  view: import('./health-log-types').WeightChartView,
  anchor: Date
): { startDate: Date; endDate: Date } => {
  const endDate = new Date(anchor)
  endDate.setHours(23, 59, 59, 999)

  const startDate = new Date(anchor)

  switch (view) {
    case 'week':
      startDate.setDate(startDate.getDate() - 6)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'month':
      startDate.setDate(startDate.getDate() - 29)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'year':
      // 12 months back: start at 1st of that month
      startDate.setMonth(startDate.getMonth() - 11)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      break
  }

  return { startDate, endDate }
}

type RawWeightLog = { id: string; logged_at: Date; weight: import('../../generated/prisma/client').Prisma.Decimal | null }

const aggregateWeightLogs = (
  logs: RawWeightLog[],
  view: import('./health-log-types').WeightChartView
): import('./health-log-types').WeightChartPoint[] => {
  if (logs.length === 0) return []

  if (view === 'week' || view === 'month') {
    return logs.map(log => {
      const date = new Date(log.logged_at)
      const dateStr = date.toISOString().split('T')[0]
      const label = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })

      return {
        date: dateStr,
        label,
        weight: Number(log.weight),
        logId: log.id,
        logCount: 1
      }
    })
  }

  // Year view: group by calendar month, then average
  const byMonth: Record<string, { weights: number[]; firstDate: string }> = {}

  for (const log of logs) {
    const date = new Date(log.logged_at)
    const year = date.getFullYear()
    const month = date.getMonth()
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`

    if (!byMonth[monthKey]) {
      byMonth[monthKey] = {
        weights: [],
        firstDate: `${monthKey}-01`
      }
    }
    byMonth[monthKey].weights.push(Number(log.weight))
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, { weights, firstDate }]) => {
      const [year, month] = monthKey.split('-').map(Number)
      const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length
      const thaiYear = year + 543
      const label = `${THAI_MONTHS_SHORT[month - 1]} ${thaiYear}`

      return {
        date: firstDate,
        label,
        weight: Math.round(avgWeight * 100) / 100,
        logCount: weights.length
        // logId intentionally absent — this is an aggregate
      }
    })
}

export const getWeightChartData = async (
  petId: string,
  userId: string,
  view: import('./health-log-types').WeightChartView,
  anchorDate?: Date
): Promise<import('./health-log-types').WeightChartData> => {
  const hasAccess = await canAccessPet(petId, userId)
  if (!hasAccess) {
    throw new BadRequestError('Access denied to this pet')
  }

  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    select: { user_id: true }
  })
  if (!pet) {
    throw new NotFoundError('Pet not found')
  }

  const anchor = anchorDate ?? new Date()
  const { startDate, endDate } = getChartDateRange(view, anchor)
  const logs = await healthLogRepository.findWeightLogsInRange(petId, startDate, endDate)
  const points = aggregateWeightLogs(logs, view)

  return {
    view,
    rangeStart: startDate.toISOString().split('T')[0],
    rangeEnd: endDate.toISOString().split('T')[0],
    points,
    hasData: points.length > 0
  }
}
