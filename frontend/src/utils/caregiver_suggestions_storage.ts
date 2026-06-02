import AsyncStorage from '@react-native-async-storage/async-storage'

const CAREGIVER_SUGGESTIONS_KEY = '@caregiver_suggestions'
const MAX_SUGGESTIONS = 20

export interface CaregiverSuggestion {
  alias: string
  lastUsed: string
}

/**
 * Get all caregiver suggestions sorted by most recently used
 */
export async function getCaregiverSuggestions(): Promise<
  CaregiverSuggestion[]
> {
  try {
    const stored = await AsyncStorage.getItem(CAREGIVER_SUGGESTIONS_KEY)
    if (!stored) return []

    const suggestions: CaregiverSuggestion[] = JSON.parse(stored)
    return suggestions.sort(
      (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    )
  } catch (error) {
    return []
  }
}

/**
 * Add or update a caregiver alias to suggestions
 */
export async function saveCaregiverSuggestion(alias: string): Promise<void> {
  try {
    const trimmedAlias = alias.trim()
    if (!trimmedAlias) return

    const suggestions = await getCaregiverSuggestions()

    const filtered = suggestions.filter((s) => s.alias !== trimmedAlias)

    const updated: CaregiverSuggestion[] = [
      { alias: trimmedAlias, lastUsed: new Date().toISOString() },
      ...filtered
    ].slice(0, MAX_SUGGESTIONS) // Keep only the most recent MAX_SUGGESTIONS

    await AsyncStorage.setItem(
      CAREGIVER_SUGGESTIONS_KEY,
      JSON.stringify(updated)
    )
  } catch (error) {
  }
}

/**
 * Remove a specific caregiver suggestion
 */
export async function removeCaregiverSuggestion(alias: string): Promise<void> {
  try {
    const suggestions = await getCaregiverSuggestions()
    const filtered = suggestions.filter((s) => s.alias !== alias)
    await AsyncStorage.setItem(
      CAREGIVER_SUGGESTIONS_KEY,
      JSON.stringify(filtered)
    )
  } catch (error) {
  }
}

/**
 * Filter suggestions based on input text
 */
export function filterSuggestions(
  suggestions: CaregiverSuggestion[],
  input: string
): CaregiverSuggestion[] {
  const trimmedInput = input.trim().toLowerCase()
  if (!trimmedInput) return suggestions

  return suggestions.filter((s) => s.alias.toLowerCase().includes(trimmedInput))
}
