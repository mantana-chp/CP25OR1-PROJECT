import * as fs from 'fs'
import * as path from 'path'
import { logger } from '../../libs/logger'
import { HealthAlertKeywordsConfig, HealthAlertKeyword } from './health-insight-types'

// Cache keywords in memory for performance
let keywordCache: HealthAlertKeywordsConfig | null = null
let lastCacheTime: number | null = null

// Cache duration: 1 day (24 hours)
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000

/**
 * Loads health alert keywords from JSON config file.
 * Results are cached for 1 day to avoid repeated file reads.
 */
export const loadHealthAlertKeywords = (): HealthAlertKeywordsConfig => {
  const now = Date.now()

  // Return cached keywords if still valid
  if (keywordCache && lastCacheTime && now - lastCacheTime < CACHE_DURATION_MS) {
    return keywordCache
  }

  try {
    const configPath = path.join(__dirname, '../../../config/health-alert-keywords.json')
    const fileContent = fs.readFileSync(configPath, 'utf8')
    const config: HealthAlertKeywordsConfig = JSON.parse(fileContent)

    // Validate config structure
    if (!config.critical || !config.warning) {
      throw new Error('Invalid config structure: missing critical or warning arrays')
    }

    // Update cache
    keywordCache = config
    lastCacheTime = now

    logger.info(`[KeywordLoader] Loaded ${config.critical.length} critical and ${config.warning.length} warning keywords`)

    return config
  } catch (error) {
    logger.error('[KeywordLoader] Failed to load health alert keywords:', error as Error)

    // Return empty fallback config if file cannot be read
    return {
      critical: [],
      warning: [],
    }
  }
}

/**
 * Gets all enabled critical keywords.
 */
export const getCriticalKeywords = (): HealthAlertKeyword[] => {
  const config = loadHealthAlertKeywords()
  return config.critical.filter(k => k.enabled)
}

/**
 * Gets all enabled warning keywords.
 */
export const getWarningKeywords = (): HealthAlertKeyword[] => {
  const config = loadHealthAlertKeywords()
  return config.warning.filter(k => k.enabled)
}

/**
 * Gets all enabled keywords (both critical and warning).
 */
export const getAllKeywords = (): HealthAlertKeyword[] => {
  const config = loadHealthAlertKeywords()
  return [...config.critical, ...config.warning].filter(k => k.enabled)
}

/**
 * Checks if a description contains any critical keywords.
 * Returns the first matched keyword or null.
 */
export const findCriticalKeyword = (description: string): HealthAlertKeyword | null => {
  const lowerDesc = description.toLowerCase()
  const criticalKeywords = getCriticalKeywords()

  for (const kw of criticalKeywords) {
    if (lowerDesc.includes(kw.keyword.toLowerCase())) {
      return kw
    }
  }

  return null
}

/**
 * Checks if a description contains any warning keywords.
 * Returns the first matched keyword or null.
 */
export const findWarningKeyword = (description: string): HealthAlertKeyword | null => {
  const lowerDesc = description.toLowerCase()
  const warningKeywords = getWarningKeywords()

  for (const kw of warningKeywords) {
    if (lowerDesc.includes(kw.keyword.toLowerCase())) {
      return kw
    }
  }

  return null
}

/**
 * Analyzes symptom description and returns severity level with matched keyword.
 */
export const analyzeSymptomSeverity = (
  description: string
): { severity: 'CRITICAL' | 'WARNING' | 'NORMAL'; keyword: HealthAlertKeyword | null } => {
  // Check critical keywords first
  const criticalMatch = findCriticalKeyword(description)
  if (criticalMatch) {
    return { severity: 'CRITICAL', keyword: criticalMatch }
  }

  // Check warning keywords
  const warningMatch = findWarningKeyword(description)
  if (warningMatch) {
    return { severity: 'WARNING', keyword: warningMatch }
  }

  // No match
  return { severity: 'NORMAL', keyword: null }
}

/**
 * Forces a reload of keywords from disk (e.g., after config file update).
 */
export const reloadKeywords = (): void => {
  keywordCache = null
  lastCacheTime = null
  loadHealthAlertKeywords()
  logger.info('[KeywordLoader] Keywords reloaded from disk')
}
