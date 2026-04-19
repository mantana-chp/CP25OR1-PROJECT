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
