/**
 * AsyncStorage for excluded dates (frontend-only workaround)
 * This tracks which dates have been deleted from recurring reminders
 * until the backend implements proper excluded_dates support
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'reminder_excluded_dates'

interface ExcludedDatesMap {
  [ruleId: string]: string[] // ruleId -> array of excluded dates (YYYY-MM-DD)
}

/**
 * Get all excluded dates from AsyncStorage
 */
export async function getExcludedDates(): Promise<ExcludedDatesMap> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Failed to get excluded dates from storage:', error)
    return {}
  }
}

/**
 * Add an excluded date for a recurring rule
 */
export async function addExcludedDate(
  ruleId: string,
  date: string
): Promise<void> {
  try {
    const excludedDates = await getExcludedDates()

    if (!excludedDates[ruleId]) {
      excludedDates[ruleId] = []
    }

    // Add date if not already excluded
    const dateOnly = date.split('T')[0] // Normalize to YYYY-MM-DD
    if (!excludedDates[ruleId].includes(dateOnly)) {
      excludedDates[ruleId].push(dateOnly)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(excludedDates))
      console.log('[AsyncStorage] Added excluded date:', {
        ruleId,
        date: dateOnly
      })
    }
  } catch (error) {
    console.error('Failed to add excluded date to storage:', error)
  }
}

/**
 * Remove all excluded dates for a recurring rule (when deleting entire series)
 */
export async function removeRuleExcludedDates(ruleId: string): Promise<void> {
  try {
    const excludedDates = await getExcludedDates()
    delete excludedDates[ruleId]
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(excludedDates))
    console.log('[AsyncStorage] Removed all excluded dates for rule:', ruleId)
  } catch (error) {
    console.error('Failed to remove rule excluded dates from storage:', error)
  }
}

/**
 * Get excluded dates for a specific rule
 */
export async function getRuleExcludedDates(ruleId: string): Promise<string[]> {
  const excludedDates = await getExcludedDates()
  return excludedDates[ruleId] || []
}

/**
 * Clear all excluded dates (for debugging or reset)
 */
export async function clearAllExcludedDates(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY)
    console.log('[AsyncStorage] Cleared all excluded dates')
  } catch (error) {
    console.error('Failed to clear excluded dates from storage:', error)
  }
}
