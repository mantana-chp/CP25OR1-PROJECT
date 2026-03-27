import prisma from '../../libs/db'
import { logger } from '../../libs/logger'
import { subDays } from 'date-fns'
import { HealthLogCategory } from '../../generated/prisma/client'
import {
  DetectedPattern,
  RecurringSymptomPattern,
  AbnormalSymptomPattern,
  WeightAnomalyPattern,
  RecurringBehaviorPattern,
  NoRecentLogsPattern,
  FollowUpReminderPattern,
  getWeightThreshold,
} from './health-insight-types'
import { analyzeSymptomSeverity } from './keyword-loader'
import * as healthInsightRepository from './health-insight-repository'

/**
 * Detects recurring symptoms for a pet.
 * Returns pattern if same symptom appears 3+ times in last 7 days.
 */
export const detectRecurringSymptoms = async (petId: string): Promise<RecurringSymptomPattern | null> => {
  const sevenDaysAgo = subDays(new Date(), 7)

  const symptomLogs = await prisma.health_logs.findMany({
    where: {
      pet_id: petId,
      category: HealthLogCategory.SYMPTOMS,
      logged_at: { gte: sevenDaysAgo },
    },
    orderBy: { logged_at: 'desc' },
  })

  if (symptomLogs.length < 3) {
    return null
  }

  // Group by similar descriptions (exact match for now, can add fuzzy matching later)
  const symptomGroups = new Map<string, typeof symptomLogs>()

  for (const log of symptomLogs) {
    const desc = log.description.trim().toLowerCase()
    if (!symptomGroups.has(desc)) {
      symptomGroups.set(desc, [])
    }
    symptomGroups.get(desc)!.push(log)
  }

  // Find symptoms that occurred 3+ times
  for (const [symptom, occurrences] of symptomGroups.entries()) {
    if (occurrences.length >= 3) {
      // Check if we already notified about this recently
      const existingInsight = await healthInsightRepository.findSimilarRecentInsight(
        petId,
        'RECURRING_SYMPTOM',
        { symptom },
        3
      )

      if (existingInsight) {
        logger.info(`[Detection] Skipping duplicate RECURRING_SYMPTOM for pet ${petId}: "${symptom}"`)
        continue
      }

      return {
        type: 'RECURRING_SYMPTOM',
        severity: 'MEDIUM',
        symptom: occurrences[0].description, // Use original casing
        count: occurrences.length,
        logIds: occurrences.map(l => l.id),
        firstOccurrence: occurrences[occurrences.length - 1].logged_at,
        lastOccurrence: occurrences[0].logged_at,
      }
    }
  }

  return null
}

/**
 * Detects abnormal symptoms based on critical keywords.
 * This is for IMMEDIATE alerts, not delayed follow-ups.
 */
export const detectAbnormalSymptom = async (
  petId: string,
  logId: string,
  description: string,
  loggedAt: Date
): Promise<AbnormalSymptomPattern | null> => {
  const analysis = analyzeSymptomSeverity(description)

  if (analysis.severity === 'CRITICAL' && analysis.keyword) {
    // Check if we already alerted about this specific log
    const existingInsight = await prisma.health_insights.findFirst({
      where: {
        pet_id: petId,
        insight_type: 'ABNORMAL_SYMPTOM',
        context_data: {
          path: ['logId'],
          equals: logId,
        },
      },
    })

    if (existingInsight) {
      logger.info(`[Detection] Skipping duplicate ABNORMAL_SYMPTOM alert for log ${logId}`)
      return null
    }

    return {
      type: 'ABNORMAL_SYMPTOM',
      severity: 'CRITICAL',
      symptom: description,
      keyword: analysis.keyword.keyword,
      category: analysis.keyword.category,
      logId,
      loggedAt,
    }
  }

  return null
}

/**
 * Detects weight anomalies (rapid loss or gain).
 * Compares current weight to weight N days ago based on species-specific thresholds.
 */
export const detectWeightAnomalies = async (petId: string): Promise<WeightAnomalyPattern | null> => {
  // Get pet species
  const pet = await prisma.pets.findUnique({
    where: { id: petId },
    include: { species: true },
  })

  if (!pet) {
    return null
  }

  const threshold = getWeightThreshold(pet.species.name)
  const windowDaysAgo = subDays(new Date(), threshold.windowDays)

  // Get recent weight logs
  const weightLogs = await prisma.health_logs.findMany({
    where: {
      pet_id: petId,
      category: HealthLogCategory.WEIGHT,
      weight: { not: null },
      logged_at: { gte: windowDaysAgo },
    },
    orderBy: { logged_at: 'desc' },
  })

  if (weightLogs.length < 2) {
    return null // Need at least 2 weight measurements
  }

  const latestLog = weightLogs[0]
  const oldestLog = weightLogs[weightLogs.length - 1]

  const currentWeight = Number(latestLog.weight!)
  const previousWeight = Number(oldestLog.weight!)
  const changeAmount = currentWeight - previousWeight
  const changePercent = Math.abs((changeAmount / previousWeight) * 100)

  const timeSpanDays = Math.ceil(
    (latestLog.logged_at.getTime() - oldestLog.logged_at.getTime()) / (1000 * 60 * 60 * 24)
  )

  // Check for rapid weight loss
  if (changeAmount < 0 && changePercent >= threshold.lossPercent) {
    const existingInsight = await healthInsightRepository.findSimilarRecentInsight(
      petId,
      'RAPID_WEIGHT_LOSS',
      { type: 'loss' },
      3
    )

    if (existingInsight) {
      logger.info(`[Detection] Skipping duplicate RAPID_WEIGHT_LOSS for pet ${petId}`)
      return null
    }

    return {
      type: 'RAPID_WEIGHT_LOSS',
      severity: changePercent >= threshold.lossPercent * 1.5 ? 'HIGH' : 'MEDIUM',
      currentWeight,
      previousWeight,
      changePercent,
      changeAmount: Math.abs(changeAmount),
      timeSpanDays,
      logIds: weightLogs.map(l => l.id),
      species: pet.species.name,
    }
  }

  // Check for rapid weight gain
  if (changeAmount > 0 && changePercent >= threshold.gainPercent) {
    const existingInsight = await healthInsightRepository.findSimilarRecentInsight(
      petId,
      'RAPID_WEIGHT_GAIN',
      { type: 'gain' },
      3
    )

    if (existingInsight) {
      logger.info(`[Detection] Skipping duplicate RAPID_WEIGHT_GAIN for pet ${petId}`)
      return null
    }

    return {
      type: 'RAPID_WEIGHT_GAIN',
      severity: changePercent >= threshold.gainPercent * 1.5 ? 'HIGH' : 'MEDIUM',
      currentWeight,
      previousWeight,
      changePercent,
      changeAmount,
      timeSpanDays,
      logIds: weightLogs.map(l => l.id),
      species: pet.species.name,
    }
  }

  return null
}

/**
 * Detects recurring behavior patterns.
 * Returns pattern if same behavior appears 3+ times in last 7 days.
 */
export const detectRecurringBehavior = async (petId: string): Promise<RecurringBehaviorPattern | null> => {
  const sevenDaysAgo = subDays(new Date(), 7)

  const behaviorLogs = await prisma.health_logs.findMany({
    where: {
      pet_id: petId,
      category: HealthLogCategory.BEHAVIOR,
      logged_at: { gte: sevenDaysAgo },
    },
    orderBy: { logged_at: 'desc' },
  })

  if (behaviorLogs.length < 3) {
    return null
  }

  // Group by similar descriptions
  const behaviorGroups = new Map<string, typeof behaviorLogs>()

  for (const log of behaviorLogs) {
    const desc = log.description.trim().toLowerCase()
    if (!behaviorGroups.has(desc)) {
      behaviorGroups.set(desc, [])
    }
    behaviorGroups.get(desc)!.push(log)
  }

  // Find behaviors that occurred 3+ times
  for (const [behavior, occurrences] of behaviorGroups.entries()) {
    if (occurrences.length >= 3) {
      const existingInsight = await healthInsightRepository.findSimilarRecentInsight(
        petId,
        'RECURRING_BEHAVIOR',
        { behavior },
        3
      )

      if (existingInsight) {
        logger.info(`[Detection] Skipping duplicate RECURRING_BEHAVIOR for pet ${petId}: "${behavior}"`)
        continue
      }

      return {
        type: 'RECURRING_BEHAVIOR',
        severity: 'MEDIUM',
        behavior: occurrences[0].description, // Use original casing
        count: occurrences.length,
        logIds: occurrences.map(l => l.id),
        firstOccurrence: occurrences[occurrences.length - 1].logged_at,
        lastOccurrence: occurrences[0].logged_at,
      }
    }
  }

  return null
}

/**
 * Detects pets with no recent health logs.
 * Sends a reminder to encourage logging.
 */
export const detectNoRecentLogs = async (petId: string): Promise<NoRecentLogsPattern | null> => {
  const sevenDaysAgo = subDays(new Date(), 7)

  const recentLogCount = await prisma.health_logs.count({
    where: {
      pet_id: petId,
      logged_at: { gte: sevenDaysAgo },
    },
  })

  if (recentLogCount > 0) {
    return null // Pet has recent logs
  }

  // Check if pet has any active reminders (if yes, they should be logging)
  const activeReminders = await prisma.reminders.count({
    where: {
      pet_id: petId,
      reminder_status: { in: ['to_do', 'overdue'] },
    },
  })

  if (activeReminders === 0) {
    return null // No reminders, so no need to nag about logging
  }

  // Check if we already sent this reminder recently
  const existingInsight = await healthInsightRepository.findRecentInsightByType(
    petId,
    'NO_RECENT_LOGS',
    7 // Don't send this reminder more than once a week
  )

  if (existingInsight) {
    logger.info(`[Detection] Skipping duplicate NO_RECENT_LOGS for pet ${petId}`)
    return null
  }

  // Find last log date
  const lastLog = await prisma.health_logs.findFirst({
    where: { pet_id: petId },
    orderBy: { logged_at: 'desc' },
  })

  const daysSinceLastLog = lastLog
    ? Math.ceil((Date.now() - lastLog.logged_at.getTime()) / (1000 * 60 * 60 * 24))
    : 999

  return {
    type: 'NO_RECENT_LOGS',
    severity: 'LOW',
    daysSinceLastLog,
    lastLogDate: lastLog?.logged_at || null,
  }
}

/**
 * Detects abnormal symptoms that need follow-up after 2 days.
 * This runs as part of the daily cron job.
 */
export const detectFollowUpReminders = async (petId: string): Promise<FollowUpReminderPattern | null> => {
  const twoDaysAgo = subDays(new Date(), 2)
  const threeDaysAgo = subDays(new Date(), 3)

  // Find abnormal symptom insights from exactly 2 days ago (not already followed up)
  const unresolvedInsights = await prisma.health_insights.findMany({
    where: {
      pet_id: petId,
      insight_type: 'ABNORMAL_SYMPTOM',
      detected_at: {
        gte: threeDaysAgo,
        lte: twoDaysAgo,
      },
      resolved_at: null,
    },
  })

  if (unresolvedInsights.length === 0) {
    return null
  }

  // Take the first unresolved insight
  const insight = unresolvedInsights[0]
  const contextData = insight.context_data as any

  // Check if we already sent a follow-up for this
  const existingFollowUp = await prisma.health_insights.findFirst({
    where: {
      pet_id: petId,
      insight_type: 'FOLLOW_UP_REMINDER',
      context_data: {
        path: ['originalInsightId'],
        equals: insight.id,
      },
    },
  })

  if (existingFollowUp) {
    logger.info(`[Detection] Skipping duplicate FOLLOW_UP_REMINDER for insight ${insight.id}`)
    return null
  }

  const daysSinceSymptom = Math.ceil((Date.now() - insight.detected_at.getTime()) / (1000 * 60 * 60 * 24))

  return {
    type: 'FOLLOW_UP_REMINDER',
    severity: 'MEDIUM',
    symptom: contextData.symptom || insight.title,
    daysSinceSymptom,
    originalLogId: contextData.logId,
    originalLogDate: new Date(contextData.loggedAt),
  }
}

/**
 * Main entry point: Analyzes a single pet for all pattern types.
 * Returns the first detected pattern (prioritized by severity).
 */
export const analyzePetForInsights = async (petId: string): Promise<DetectedPattern | null> => {
  logger.info(`[Detection] Analyzing pet ${petId} for health insights...`)

  // Priority 1: Weight anomalies (often critical)
  const weightAnomaly = await detectWeightAnomalies(petId)
  if (weightAnomaly) {
    logger.info(`[Detection] Found ${weightAnomaly.type} for pet ${petId}`)
    return weightAnomaly
  }

  // Priority 2: Recurring symptoms
  const recurringSymptom = await detectRecurringSymptoms(petId)
  if (recurringSymptom) {
    logger.info(`[Detection] Found RECURRING_SYMPTOM for pet ${petId}`)
    return recurringSymptom
  }

  // Priority 3: Recurring behaviors
  const recurringBehavior = await detectRecurringBehavior(petId)
  if (recurringBehavior) {
    logger.info(`[Detection] Found RECURRING_BEHAVIOR for pet ${petId}`)
    return recurringBehavior
  }

  // Priority 4: Follow-up reminders
  const followUp = await detectFollowUpReminders(petId)
  if (followUp) {
    logger.info(`[Detection] Found FOLLOW_UP_REMINDER for pet ${petId}`)
    return followUp
  }

  // Priority 5: No recent logs (lowest priority)
  const noRecentLogs = await detectNoRecentLogs(petId)
  if (noRecentLogs) {
    logger.info(`[Detection] Found NO_RECENT_LOGS for pet ${petId}`)
    return noRecentLogs
  }

  logger.info(`[Detection] No patterns detected for pet ${petId}`)
  return null
}
