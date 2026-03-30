import prisma from '../../libs/db'
import { logger } from '../../libs/logger'
import { subDays } from 'date-fns'
import * as healthInsightDetection from './health-insight-detection-service'
import * as healthInsightGeneration from './health-insight-generation-service'
import * as healthInsightRepository from './health-insight-repository'
import * as notificationService from '../notifications/notification-service'
import { DetectedPattern, getSeverityEmoji, BatchInsightGenerationInput } from './health-insight-types'
import { HealthInsightSeverity } from '../../generated/prisma/client'

/**
 * Splits an array into chunks of a specified size.
 */
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Compares severity levels for priority selection.
 * Returns true if severity1 > severity2.
 */
const isSeverityHigher = (severity1: HealthInsightSeverity, severity2: HealthInsightSeverity): boolean => {
  const severityOrder: Record<HealthInsightSeverity, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  }
  return severityOrder[severity1] > severityOrder[severity2]
}

/**
 * Checks if a user is eligible to receive health insights today.
 * Implements smart cooldown rules:
 * - Skip if got insight yesterday (except if yesterday was LOW/MEDIUM and today is HIGH/CRITICAL)
 * - Skip if weekly cap exceeded (4 insights/week, but allow HIGH/CRITICAL)
 * - Skip if got LOW severity when user received AI tip today
 */
const isUserEligible = async (
  userId: string,
  currentPattern: DetectedPattern
): Promise<{ eligible: boolean; reason?: string }> => {
  // Check if user got insight yesterday
  const yesterdayStart = subDays(new Date(), 1)
  yesterdayStart.setUTCHours(0, 0, 0, 0)
  const yesterdayEnd = subDays(new Date(), 1)
  yesterdayEnd.setUTCHours(23, 59, 59, 999)

  const yesterdayInsight = await prisma.health_insights.findFirst({
    where: {
      pet: { user_id: userId },
      detected_at: {
        gte: yesterdayStart,
        lte: yesterdayEnd,
      },
      notified_at: { not: null },
    },
    orderBy: { detected_at: 'desc' },
    select: { severity: true },
  })

  if (yesterdayInsight) {
    // Smart cooldown: Skip LOW/MEDIUM if got insight yesterday
    // Allow HIGH/CRITICAL if yesterday was LOW/MEDIUM
    const yesterdaySeverity = yesterdayInsight.severity
    const currentSeverity = currentPattern.severity

    if (
      yesterdaySeverity === 'HIGH' ||
      yesterdaySeverity === 'CRITICAL' ||
      currentSeverity === 'LOW' ||
      currentSeverity === 'MEDIUM'
    ) {
      return {
        eligible: false,
        reason: `Got ${yesterdaySeverity} insight yesterday, current is ${currentSeverity}`,
      }
    }
    // Allow if yesterday was LOW/MEDIUM and current is HIGH/CRITICAL
  }

  // Check weekly cap (last 7 days)
  const weeklyCount = await healthInsightRepository.countInsightsForUserInLastDays(userId, 7)
  if (weeklyCount >= 4) {
    // Weekly cap exceeded, but still allow HIGH/CRITICAL
    if (currentPattern.severity !== 'HIGH' && currentPattern.severity !== 'CRITICAL') {
      return { eligible: false, reason: `Weekly cap reached (${weeklyCount}/4), and current is not urgent` }
    }
  }

  // Check if user got AI tip today - skip LOW severity
  if (currentPattern.severity === 'LOW') {
    const hasNotificationToday = await healthInsightRepository.hasUserReceivedNotificationToday(userId)
    if (hasNotificationToday) {
      return { eligible: false, reason: 'User got notification today and current pattern is LOW severity' }
    }
  }

  return { eligible: true }
}

/**
 * Checks if a specific pet is eligible for insight today.
 * Implements pet-level cooldown: skip if same pet got insight in last 2 days,
 * unless current severity is higher than previous.
 */
const isPetEligible = async (
  petId: string,
  currentPattern: DetectedPattern
): Promise<{ eligible: boolean; reason?: string }> => {
  const twoDaysAgo = subDays(new Date(), 2)

  const recentInsight = await prisma.health_insights.findFirst({
    where: {
      pet_id: petId,
      detected_at: { gte: twoDaysAgo },
      notified_at: { not: null },
    },
    orderBy: { detected_at: 'desc' },
    select: { severity: true, insight_type: true },
  })

  if (recentInsight) {
    // Skip if same pet got insight recently, UNLESS current severity is CRITICAL
    if (currentPattern.severity === 'CRITICAL') {
      return { eligible: true } // Always allow CRITICAL
    }

    // Skip if previous was HIGH/CRITICAL
    if (recentInsight.severity === 'HIGH' || recentInsight.severity === 'CRITICAL') {
      return { eligible: false, reason: `Pet got ${recentInsight.severity} insight in last 2 days` }
    }

    // Skip if current is same or lower severity
    if (!isSeverityHigher(currentPattern.severity, recentInsight.severity)) {
      return { eligible: false, reason: `Pet got insight recently, current severity not higher` }
    }
  }

  return { eligible: true }
}

/**
 * Selects the highest priority pattern for a user from their pets.
 * Priority: CRITICAL > HIGH > MEDIUM > LOW
 * If tie, pick most recent occurrence.
 */
const selectHighestPriorityPattern = async (
  userId: string,
  petsWithPatterns: Array<{ pet: any; pattern: DetectedPattern }>
): Promise<{ pet: any; pattern: DetectedPattern } | null> => {
  if (petsWithPatterns.length === 0) {
    return null
  }

  // Filter out pets that are not eligible
  const eligiblePets: Array<{ pet: any; pattern: DetectedPattern }> = []
  for (const item of petsWithPatterns) {
    const petEligibility = await isPetEligible(item.pet.id, item.pattern)
    if (petEligibility.eligible) {
      eligiblePets.push(item)
    } else {
      logger.info(
        `[SelectionLogic] Pet ${item.pet.pet_name} not eligible: ${petEligibility.reason}`
      )
    }
  }

  if (eligiblePets.length === 0) {
    return null
  }

  // Sort by severity (CRITICAL > HIGH > MEDIUM > LOW)
  eligiblePets.sort((a, b) => {
    const severityOrder: Record<HealthInsightSeverity, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    }
    return severityOrder[b.pattern.severity] - severityOrder[a.pattern.severity]
  })

  return eligiblePets[0]
}

/**
 * Main entry point: Analyzes all active pets and sends health insight notifications.
 * New approach: User-based batching with smart cooldown rules.
 * Called by the daily cron job at 19:00 Bangkok time.
 */
export const analyzeAllPetsAndSendInsights = async (): Promise<void> => {
  logger.info('========================================')
  logger.info('🏥 RUNNING HEALTH INSIGHTS JOB (V2 - Smart Batching)')
  logger.info('========================================')

  try {
    // Get all users with active pets (excluding those who got insight today)
    const eligibleUsers = await healthInsightRepository.getEligibleUsersForHealthInsights()

    if (eligibleUsers.length === 0) {
      logger.info('[HealthInsightsJob] No eligible users found.')
      logger.info('========================================')
      return
    }

    logger.info(`[HealthInsightsJob] Found ${eligibleUsers.length} users with active pets to evaluate`)

    // For each user, analyze all their pets and select highest priority pattern
    const usersWithSelectedPatterns: Array<{
      userId: string
      petId: string
      petName: string
      species: string
      breed: string | null
      pattern: DetectedPattern
    }> = []

    for (const user of eligibleUsers) {
      try {
        logger.info(`[HealthInsightsJob] Evaluating user ${user.id} with ${user.pets.length} pet(s)`)

        const petsWithPatterns: Array<{ pet: any; pattern: DetectedPattern }> = []

        // Detect patterns for all user's pets
        for (const pet of user.pets) {
          const detectedPattern = await healthInsightDetection.analyzePetForInsights(pet.id)
          if (detectedPattern) {
            logger.info(`[HealthInsightsJob] Detected ${detectedPattern.type} (${detectedPattern.severity}) for ${pet.pet_name}`)
            petsWithPatterns.push({ pet, pattern: detectedPattern })
          }
        }

        if (petsWithPatterns.length === 0) {
          logger.info(`[HealthInsightsJob] No patterns detected for user ${user.id}`)
          continue
        }

        // Select highest priority pattern
        const selectedItem = await selectHighestPriorityPattern(user.id, petsWithPatterns)
        if (!selectedItem) {
          logger.info(`[HealthInsightsJob] No eligible patterns for user ${user.id} after filtering`)
          continue
        }

        // Check user-level eligibility
        const userEligibility = await isUserEligible(user.id, selectedItem.pattern)
        if (!userEligibility.eligible) {
          logger.info(`[HealthInsightsJob] User ${user.id} not eligible: ${userEligibility.reason}`)
          continue
        }

        // User is eligible!
        logger.info(
          `[HealthInsightsJob] Selected pattern for user ${user.id}: ${selectedItem.pattern.type} (${selectedItem.pattern.severity}) for ${selectedItem.pet.pet_name}`
        )

        usersWithSelectedPatterns.push({
          userId: user.id,
          petId: selectedItem.pet.id,
          petName: selectedItem.pet.pet_name,
          species: selectedItem.pet.species.name,
          breed: selectedItem.pet.breeds?.name || null,
          pattern: selectedItem.pattern,
        })
      } catch (error) {
        logger.error(`[HealthInsightsJob] Error evaluating user ${user.id}:`, error as Error)
        continue
      }
    }

    if (usersWithSelectedPatterns.length === 0) {
      logger.info('[HealthInsightsJob] No users qualified for insights after all filters.')
      logger.info('========================================')
      return
    }

    logger.info(`[HealthInsightsJob] ${usersWithSelectedPatterns.length} users qualified for insights`)

    // Batch process: 20 users per AI request
    const BATCH_SIZE = 20
    const batches = chunkArray(usersWithSelectedPatterns, BATCH_SIZE)

    let insightsGenerated = 0
    let notificationsSent = 0

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      logger.info(`[HealthInsightsJob] Processing batch ${i + 1}/${batches.length} (${batch.length} users)`)

      try {
        // Generate AI insights in batch
        const batchInput: BatchInsightGenerationInput[] = batch.map(item => ({
          userId: item.userId,
          petId: item.petId,
          petName: item.petName,
          species: item.species,
          breed: item.breed,
          pattern: item.pattern,
        }))

        const generatedInsights = await healthInsightGeneration.generateInsightsBatch(batchInput)

        // Save insights and send notifications
        for (const generatedInsight of generatedInsights) {
          const originalItem = batch.find(
            item => item.userId === generatedInsight.userId && item.petId === generatedInsight.petId
          )
          if (!originalItem) {
            logger.warn(`[HealthInsightsJob] Could not find original item for ${generatedInsight.petId}`)
            continue
          }

          try {
            // Add severity emoji to title
            const titleWithEmoji = `${getSeverityEmoji(originalItem.pattern.severity)} ${generatedInsight.title.replace(/^[🚨⚠️💡ℹ️📌📝📋]\s*/, '')}`

            // Save insight to database
            const savedInsight = await healthInsightRepository.create({
              pet_id: originalItem.petId,
              insight_type: originalItem.pattern.type,
              severity: originalItem.pattern.severity,
              title: titleWithEmoji,
              description: generatedInsight.description,
              context_data: originalItem.pattern,
            })

            insightsGenerated++
            logger.info(`[HealthInsightsJob] Created insight ${savedInsight.id} for ${originalItem.petName}`)

            // Send notifications to owner + caregivers
            await notificationService.sendHealthInsightNotification(
              originalItem.petId,
              savedInsight.id,
              titleWithEmoji,
              generatedInsight.description
            )

            // Mark insight as notified
            await healthInsightRepository.markAsNotified(savedInsight.id)

            notificationsSent++
            logger.info(`[HealthInsightsJob] Notification sent for insight ${savedInsight.id}`)
          } catch (error) {
            logger.error(
              `[HealthInsightsJob] Error saving/sending insight for pet ${originalItem.petName}:`,
              error as Error
            )
          }
        }
      } catch (error) {
        logger.error(`[HealthInsightsJob] Error processing batch ${i + 1}:`, error as Error)
      }
    }

    logger.info('========================================')
    logger.info(`[HealthInsightsJob] Summary:`)
    logger.info(`  - Users evaluated: ${eligibleUsers.length}`)
    logger.info(`  - Users qualified: ${usersWithSelectedPatterns.length}`)
    logger.info(`  - Insights generated: ${insightsGenerated}`)
    logger.info(`  - Notifications sent: ${notificationsSent}`)
    logger.info(`  - AI batches processed: ${batches.length}`)
    logger.info('========================================')
  } catch (error) {
    logger.error('[HealthInsightsJob] Fatal error in health insights job:', error as Error)
  }

  logger.info('✅ FINISHED HEALTH INSIGHTS JOB')
  logger.info('========================================')
}
