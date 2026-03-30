import prisma from '../../libs/db'
import { HealthInsightType, HealthInsightSeverity, Prisma } from '../../generated/prisma/client'

/**
 * Creates a new health insight record.
 */
export const create = async (data: {
  pet_id: string
  insight_type: HealthInsightType
  severity: HealthInsightSeverity
  title: string
  description: string
  context_data: any
}) => {
  return await prisma.health_insights.create({
    data: {
      pet_id: data.pet_id,
      insight_type: data.insight_type,
      severity: data.severity,
      title: data.title,
      description: data.description,
      context_data: data.context_data as Prisma.InputJsonValue,
    },
    include: {
      pet: {
        select: {
          id: true,
          pet_name: true,
          user_id: true,
        },
      },
    },
  })
}

/**
 * Finds a health insight by ID.
 */
export const findById = async (insightId: string) => {
  return await prisma.health_insights.findUnique({
    where: { id: insightId },
    include: {
      pet: {
        select: {
          id: true,
          pet_name: true,
          user_id: true,
        },
      },
    },
  })
}

/**
 * Finds all insights for a specific pet.
 */
export const findByPetId = async (petId: string, limit: number = 50, offset: number = 0) => {
  return await prisma.health_insights.findMany({
    where: { pet_id: petId },
    orderBy: { detected_at: 'desc' },
    take: limit,
    skip: offset,
    include: {
      pet: {
        select: {
          id: true,
          pet_name: true,
        },
      },
    },
  })
}

/**
 * Finds recent insights of a specific type for a pet (for deduplication).
 * Used to check if we should skip creating a duplicate insight.
 */
export const findRecentInsightByType = async (
  petId: string,
  insightType: HealthInsightType,
  withinDays: number = 3
) => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - withinDays)

  return await prisma.health_insights.findFirst({
    where: {
      pet_id: petId,
      insight_type: insightType,
      detected_at: { gte: cutoffDate },
      resolved_at: null, // Only unresolved insights
    },
    orderBy: { detected_at: 'desc' },
  })
}

/**
 * Checks if a similar insight exists for the same pet recently.
 * More specific than findRecentInsightByType - also matches context data.
 */
export const findSimilarRecentInsight = async (
  petId: string,
  insightType: HealthInsightType,
  contextMatch: any,
  withinDays: number = 3
) => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - withinDays)

  const recentInsights = await prisma.health_insights.findMany({
    where: {
      pet_id: petId,
      insight_type: insightType,
      detected_at: { gte: cutoffDate },
      resolved_at: null,
    },
  })

  // Check context_data for similarity
  // For RECURRING_SYMPTOM: match on symptom description
  // For WEIGHT_ANOMALY: match on type (loss/gain)
  return recentInsights.find(insight => {
    const contextData = insight.context_data as any
    if (insightType === 'RECURRING_SYMPTOM' && contextMatch.symptom) {
      return contextData.symptom === contextMatch.symptom
    }
    if (
      (insightType === 'RAPID_WEIGHT_LOSS' || insightType === 'RAPID_WEIGHT_GAIN') &&
      contextMatch.type
    ) {
      return contextData.type === contextMatch.type
    }
    return false
  })
}

/**
 * Updates an insight (e.g., mark as notified, mark as resolved).
 */
export const update = async (
  insightId: string,
  data: {
    notified_at?: Date | null
    resolved_at?: Date | null
  }
) => {
  return await prisma.health_insights.update({
    where: { id: insightId },
    data,
  })
}

/**
 * Marks an insight as notified.
 */
export const markAsNotified = async (insightId: string) => {
  return await update(insightId, { notified_at: new Date() })
}

/**
 * Marks an insight as resolved (user took action or issue no longer relevant).
 */
export const markAsResolved = async (insightId: string) => {
  return await update(insightId, { resolved_at: new Date() })
}

/**
 * Finds all unresolved insights that need follow-up reminders.
 * Used to generate FOLLOW_UP_REMINDER insights.
 */
export const findUnresolvedAbnormalSymptoms = async (daysAgo: number = 2) => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

  return await prisma.health_insights.findMany({
    where: {
      insight_type: 'ABNORMAL_SYMPTOM',
      detected_at: { lte: cutoffDate },
      resolved_at: null,
    },
    include: {
      pet: {
        select: {
          id: true,
          pet_name: true,
          user_id: true,
          species: {
            select: {
              name: true,
            },
          },
          breeds: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })
}

/**
 * Deletes old resolved insights (cleanup job).
 */
export const deleteOldResolvedInsights = async (olderThanDays: number = 90) => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  return await prisma.health_insights.deleteMany({
    where: {
      resolved_at: { lte: cutoffDate, not: null },
    },
  })
}

/**
 * Counts total insights for a pet.
 */
export const countByPetId = async (petId: string) => {
  return await prisma.health_insights.count({
    where: { pet_id: petId },
  })
}

/**
 * Gets the most recent health insight for a user across all their pets.
 * Used for daily cooldown checking.
 */
export const getMostRecentInsightForUser = async (userId: string) => {
  return await prisma.health_insights.findFirst({
    where: {
      pet: {
        user_id: userId,
      },
    },
    orderBy: { detected_at: 'desc' },
    select: {
      id: true,
      detected_at: true,
      severity: true,
      pet_id: true,
    },
  })
}

/**
 * Counts health insights sent to a user in the last N days.
 * Used for weekly cap checking.
 */
export const countInsightsForUserInLastDays = async (userId: string, days: number) => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  return await prisma.health_insights.count({
    where: {
      pet: {
        user_id: userId,
      },
      detected_at: { gte: cutoffDate },
      notified_at: { not: null }, // Only count notified insights
    },
  })
}

/**
 * Gets the most recent insight for a specific pet.
 * Used for pet-level cooldown checking.
 */
export const getMostRecentInsightForPet = async (petId: string) => {
  return await prisma.health_insights.findFirst({
    where: {
      pet_id: petId,
    },
    orderBy: { detected_at: 'desc' },
    select: {
      id: true,
      detected_at: true,
      severity: true,
      insight_type: true,
    },
  })
}

/**
 * Checks if user has received any notification today (tips or reminders).
 * Used to skip LOW severity insights if user already got AI tip.
 */
export const hasUserReceivedNotificationToday = async (userId: string) => {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const endOfDay = new Date()
  endOfDay.setUTCHours(23, 59, 59, 999)

  const notificationCount = await prisma.notifications.count({
    where: {
      user_id: userId,
      created_at: {
        gte: startOfDay,
        lte: endOfDay,
      },
      OR: [
        { tips_title: { not: null } }, // AI tip
        { reminder_id: { not: null } }, // Reminder notification
      ],
    },
  })

  return notificationCount > 0
}

/**
 * Gets eligible users for health insights with smart filtering.
 * Returns users grouped with their pets.
 */
export const getEligibleUsersForHealthInsights = async () => {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setUTCHours(0, 0, 0, 0)

  const yesterdayEnd = new Date()
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1)
  yesterdayEnd.setUTCHours(23, 59, 59, 999)

  // Get users who already got health insight today - exclude them
  const usersWithInsightToday = await prisma.health_insights.findMany({
    where: {
      detected_at: { gte: startOfDay },
      notified_at: { not: null },
    },
    select: { pet: { select: { user_id: true } } },
    distinct: ['pet_id'],
  })
  const ineligibleUserIdsToday = [...new Set(usersWithInsightToday.map(i => i.pet.user_id))]

  // Get all users with active pets
  const usersWithPets = await prisma.users.findMany({
    where: {
      id: {
        notIn: ineligibleUserIdsToday,
      },
      pets: {
        some: {
          status: 'ACTIVE',
          deleted_at: null,
        },
      },
    },
    include: {
      pets: {
        where: {
          status: 'ACTIVE',
          deleted_at: null,
        },
        include: {
          species: true,
          breeds: true,
        },
      },
    },
  })

  return usersWithPets
}
