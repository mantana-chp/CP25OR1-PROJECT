import { HealthInsightType, HealthInsightSeverity } from '../../generated/prisma/client'

// ─── Keyword Configuration ───────────────────────────────────────────────────

export interface HealthAlertKeyword {
  keyword: string
  category: string
  enabled: boolean
  description: string
}

export interface HealthAlertKeywordsConfig {
  critical: HealthAlertKeyword[]
  warning: HealthAlertKeyword[]
}

// ─── Pattern Detection Results ───────────────────────────────────────────────

export interface RecurringSymptomPattern {
  type: 'RECURRING_SYMPTOM'
  severity: HealthInsightSeverity
  symptom: string
  count: number
  logIds: string[]
  firstOccurrence: Date
  lastOccurrence: Date
}

export interface AbnormalSymptomPattern {
  type: 'ABNORMAL_SYMPTOM'
  severity: HealthInsightSeverity
  symptom: string
  keyword: string
  category: string
  logId: string
  loggedAt: Date
}

export interface WeightAnomalyPattern {
  type: 'RAPID_WEIGHT_LOSS' | 'RAPID_WEIGHT_GAIN'
  severity: HealthInsightSeverity
  currentWeight: number
  previousWeight: number
  changePercent: number
  changeAmount: number
  timeSpanDays: number
  logIds: string[]
  species: string
}

export interface RecurringBehaviorPattern {
  type: 'RECURRING_BEHAVIOR'
  severity: HealthInsightSeverity
  behavior: string
  count: number
  logIds: string[]
  firstOccurrence: Date
  lastOccurrence: Date
}

export interface NoRecentLogsPattern {
  type: 'NO_RECENT_LOGS'
  severity: HealthInsightSeverity
  daysSinceLastLog: number
  lastLogDate: Date | null
}

export interface FollowUpReminderPattern {
  type: 'FOLLOW_UP_REMINDER'
  severity: HealthInsightSeverity
  symptom: string
  daysSinceSymptom: number
  originalLogId: string
  originalLogDate: Date
}

export type DetectedPattern =
  | RecurringSymptomPattern
  | AbnormalSymptomPattern
  | WeightAnomalyPattern
  | RecurringBehaviorPattern
  | NoRecentLogsPattern
  | FollowUpReminderPattern

// ─── AI Generation Input/Output ──────────────────────────────────────────────

export interface AIInsightGenerationInput {
  petName: string
  species: string
  breed: string | null
  pattern: DetectedPattern
}

export interface AIGeneratedInsight {
  title: string
  description: string
}

// ─── Weight Threshold Configuration by Species ────────────────────────────────

export interface WeightThreshold {
  lossPercent: number
  gainPercent: number
  windowDays: number
}

export const WEIGHT_THRESHOLDS: Record<string, WeightThreshold> = {
  DOG: { lossPercent: 10, gainPercent: 15, windowDays: 14 },
  CAT: { lossPercent: 5, gainPercent: 10, windowDays: 14 },
  RABBIT: { lossPercent: 5, gainPercent: 8, windowDays: 7 },
  HAMSTER: { lossPercent: 5, gainPercent: 8, windowDays: 7 },
  BIRD: { lossPercent: 5, gainPercent: 8, windowDays: 7 },
  DEFAULT: { lossPercent: 8, gainPercent: 12, windowDays: 10 },
}

// ─── Helper Functions ────────────────────────────────────────────────────────

export const getWeightThreshold = (speciesName: string): WeightThreshold => {
  const upperSpecies = speciesName.toUpperCase()
  return WEIGHT_THRESHOLDS[upperSpecies] || WEIGHT_THRESHOLDS.DEFAULT
}

export const getSeverityEmoji = (severity: HealthInsightSeverity): string => {
  switch (severity) {
    case 'CRITICAL':
      return '🚨'
    case 'HIGH':
      return '⚠️'
    case 'MEDIUM':
      return '💡'
    case 'LOW':
      return 'ℹ️'
    default:
      return '📌'
  }
}
