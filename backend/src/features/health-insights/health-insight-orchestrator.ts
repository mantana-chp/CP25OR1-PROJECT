import prisma from '../../libs/db'
import { logger } from '../../libs/logger'
import * as healthInsightDetection from './health-insight-detection-service'
import * as healthInsightGeneration from './health-insight-generation-service'
import * as healthInsightRepository from './health-insight-repository'
import * as notificationService from '../notifications/notification-service'
import { DetectedPattern, getSeverityEmoji } from './health-insight-types'

/**
 * Main entry point: Analyzes all active pets and sends health insight notifications.
 * Called by the daily cron job.
 */
export const analyzeAllPetsAndSendInsights = async (): Promise<void> => {
  logger.info('========================================')
  logger.info('RUNNING HEALTH INSIGHTS JOB')
  logger.info('========================================')

  try {
    // Get all active pets
    const activePets = await prisma.pets.findMany({
      where: {
        status: 'ACTIVE',
        deleted_at: null,
      },
      include: {
        species: true,
        breeds: true,
        user: {
          select: {
            id: true,
          },
        },
      },
    })

    if (activePets.length === 0) {
      logger.info('[HealthInsightsJob] No active pets found.')
      logger.info('========================================')
      return
    }

    logger.info(`[HealthInsightsJob] Found ${activePets.length} active pets to analyze`)

    let insightsGenerated = 0
    let notificationsSent = 0

    for (const pet of activePets) {
      try {
        logger.info(`[HealthInsightsJob] Analyzing pet: ${pet.pet_name} (${pet.id})`)

        // Analyze pet for patterns
        const detectedPattern: DetectedPattern | null = await healthInsightDetection.analyzePetForInsights(pet.id)

        if (!detectedPattern) {
          logger.info(`[HealthInsightsJob] No insights detected for ${pet.pet_name}`)
          continue
        }

        logger.info(`[HealthInsightsJob] Detected pattern: ${detectedPattern.type} for ${pet.pet_name}`)

        // Generate AI insight
        const aiInsight = await healthInsightGeneration.generateInsightWithAI({
          petName: pet.pet_name,
          species: pet.species.name,
          breed: pet.breeds?.name || null,
          pattern: detectedPattern,
        })

        // Add severity emoji to title
        const titleWithEmoji = `${getSeverityEmoji(detectedPattern.severity)} ${aiInsight.title.replace(/^[🚨⚠️💡ℹ️📌📝📋]\s*/, '')}` // Remove existing emoji if present, then add new one

        // Save insight to database
        const savedInsight = await healthInsightRepository.create({
          pet_id: pet.id,
          insight_type: detectedPattern.type,
          severity: detectedPattern.severity,
          title: titleWithEmoji,
          description: aiInsight.description,
          context_data: detectedPattern,
        })

        insightsGenerated++
        logger.info(`[HealthInsightsJob] Created insight ${savedInsight.id} for ${pet.pet_name}`)

        // Send notifications to owner + caregivers
        await notificationService.sendHealthInsightNotification(
          pet.id,
          savedInsight.id,
          titleWithEmoji,
          aiInsight.description
        )

        // Mark insight as notified
        await healthInsightRepository.markAsNotified(savedInsight.id)

        notificationsSent++
        logger.info(`[HealthInsightsJob] Notification sent for insight ${savedInsight.id}`)
      } catch (error) {
        logger.error(`[HealthInsightsJob] Error processing pet ${pet.pet_name} (${pet.id}):`, error as Error)
        // Continue with next pet
      }
    }

    logger.info('========================================')
    logger.info(`[HealthInsightsJob] Summary:`)
    logger.info(`  - Pets analyzed: ${activePets.length}`)
    logger.info(`  - Insights generated: ${insightsGenerated}`)
    logger.info(`  - Notifications sent: ${notificationsSent}`)
    logger.info('========================================')
  } catch (error) {
    logger.error('[HealthInsightsJob] Fatal error in health insights job:', error as Error)
  }

  logger.info('FINISHED HEALTH INSIGHTS JOB')
  logger.info('========================================')
}
