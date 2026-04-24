/**
 * Absolute biological maximum weight per species (kg).
 *
 * Used as the universal hard-rejection limit for:
 * - Health log creation / upsert
 * - Pet profile weight update
 *
 * A weight above this value is biologically impossible for that species
 * regardless of the current recorded weight or time elapsed.
 */
export const SPECIES_MAX_WEIGHT_KG: Record<string, number> = {
  CAT: 30,      // Heaviest domestic cat ever recorded ~27 kg
  DOG: 120,     // Largest breeds (Mastiff, Saint Bernard) ~90–100 kg
  RABBIT: 15,   // Flemish Giant can reach ~12 kg; 15 is generous
  HAMSTER: 1,   // Syrian hamster max ~200 g; 1 kg is very generous
  BIRD: 5,      // Large parrots (Macaw) ~1.5 kg; 5 covers exotic cases
  DEFAULT: 100, // Safe fallback for unrecognised species
}

/**
 * Returns true if the given weight exceeds the known biological maximum
 * for the species, making it physically impossible.
 *
 * This is the shared hard-rejection check used in both:
 * - `health-log-service.ts` — replaces the old multiplier-based impossible check
 * - `pet-service.ts`        — validates weight in pet profile update
 */
export const exceedsSpeciesMaxWeight = (
  weight: number,
  speciesName: string
): boolean => {
  const key = speciesName.toUpperCase()
  const maxKg = SPECIES_MAX_WEIGHT_KG[key] ?? SPECIES_MAX_WEIGHT_KG['DEFAULT']
  return weight > maxKg
}

/**
 * Returns the absolute max weight (kg) for the species.
 * Useful when building human-readable error messages.
 */
export const getSpeciesMaxWeightKg = (speciesName: string): number => {
  const key = speciesName.toUpperCase()
  return SPECIES_MAX_WEIGHT_KG[key] ?? SPECIES_MAX_WEIGHT_KG['DEFAULT']
}

// ─── Species-aware rate-of-change thresholds ────────────────────────────────
// Mirrors the values in health-insight-types.ts — inlined here to avoid
// pulling the full health-insights feature into a shared utility.
const WEIGHT_THRESHOLDS: Record<string, { gainPercent: number; lossPercent: number; windowDays: number }> = {
  DOG:     { gainPercent: 15, lossPercent: 10, windowDays: 14 },
  CAT:     { gainPercent: 10, lossPercent: 5,  windowDays: 14 },
  RABBIT:  { gainPercent: 8,  lossPercent: 5,  windowDays: 7  },
  HAMSTER: { gainPercent: 8,  lossPercent: 5,  windowDays: 7  },
  BIRD:    { gainPercent: 8,  lossPercent: 5,  windowDays: 7  },
  DEFAULT: { gainPercent: 12, lossPercent: 8,  windowDays: 10 },
}

const getWeightThreshold = (speciesName: string) => {
  const key = speciesName.toUpperCase()
  return WEIGHT_THRESHOLDS[key] ?? WEIGHT_THRESHOLDS['DEFAULT']
}

/**
 * Species-aware, time-aware two-tier weight validity check.
 *
 * Returns:
 *   suspicious    — rate-of-change exceeds the time-scaled species threshold (soft warn)
 *   impossible    — weight exceeds the absolute biological max (hard block)
 *   changePercent — the raw percentage change (for log messages)
 */
export const checkWeightValidity = (
  newWeight: number,
  previousWeight: number,
  daysSince: number,
  speciesName: string
): { suspicious: boolean; impossible: boolean; changePercent: number } => {
  const impossible = exceedsSpeciesMaxWeight(newWeight, speciesName)

  const rawChange = ((newWeight - previousWeight) / previousWeight) * 100
  const changePercent = Math.abs(rawChange)
  const isGain = rawChange > 0

  const threshold = getWeightThreshold(speciesName)
  const limitPercent = isGain ? threshold.gainPercent : threshold.lossPercent
  const timeScale = Math.min(Math.max(daysSince, 1) / threshold.windowDays, 1.0)
  const warnThreshold = Math.max(10, limitPercent * timeScale)

  return {
    suspicious: changePercent > warnThreshold,
    impossible,
    changePercent,
  }
}

/**
 * Format the Thai-language soft-warning message shown to the user when a
 * weight change looks suspiciously large compared to the previous log.
 */
export const formatWeightWarningMessage = (
  previousWeight: number,
  previousDate: Date,
  newWeight: number
): string => {
  const dateStr = previousDate.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  return `น้ำหนักเปลี่ยนแปลงค่อนข้างมากจากครั้งก่อน (จาก ${previousWeight.toFixed(2)} kg เมื่อ ${dateStr} เป็น ${newWeight.toFixed(2)} kg) กรุณาตรวจสอบความถูกต้องอีกครั้ง`
}
