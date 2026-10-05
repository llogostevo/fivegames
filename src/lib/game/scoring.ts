import { CLUE_COUNT } from "@/lib/game/constants";
import { FOUND_LOCATION_RADIUS_METRES } from "@/lib/game/found";

/**
 * Maximum final score available when finishing on each clue (1-indexed via array).
 * Tune here only after play-testing — do not scatter these values elsewhere.
 *
 * Clue 1 → 25,000 … Clue 5 → 15,000 (each extra clue costs 2,500 of ceiling).
 */
export const CLUE_MAX_SCORES = [
  25_000, // Clue 1
  22_500, // Clue 2
  20_000, // Clue 3
  17_500, // Clue 4
  15_000, // Clue 5
] as const;

export const SCORING = {
  /** Absolute maximum daily score (Clue 1 FOUND / 100% accuracy). */
  MAX_TOTAL_POINTS: CLUE_MAX_SCORES[0],

  /**
   * Exponential decay length (km) for accuracy outside the FOUND radius.
   * accuracy ≈ e^(-distanceKm / DECAY_LENGTH_KM)
   */
  ACCURACY_DECAY_LENGTH_KM: 100,
} as const;

/** Maximum score available when finishing on this clue number (1–5). */
export function getClueMaxScore(clueNumber: number): number {
  if (
    !Number.isInteger(clueNumber) ||
    clueNumber < 1 ||
    clueNumber > CLUE_COUNT
  ) {
    throw new Error("Invalid clue number for scoring");
  }
  return CLUE_MAX_SCORES[clueNumber - 1]!;
}

/** Next clue's maximum, or null when already on Clue 5. */
export function getNextClueMaxScore(clueNumber: number): number | null {
  if (clueNumber >= CLUE_COUNT) {
    return null;
  }
  return getClueMaxScore(clueNumber + 1);
}

/**
 * Accuracy factor in [0, 1] from distance in kilometres.
 *
 * Within the FOUND radius (≤1 km): 1 (100%).
 * Beyond that: exp(-distanceKm / 100), matching the product curve targets.
 */
export function accuracyFactorFromDistanceKm(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return 0;
  }

  const foundRadiusKm = FOUND_LOCATION_RADIUS_METRES / 1000;
  if (distanceKm <= foundRadiusKm) {
    return 1;
  }

  const raw = Math.exp(-distanceKm / SCORING.ACCURACY_DECAY_LENGTH_KM);
  return Math.max(0, Math.min(1, raw));
}

/**
 * Single final daily score:
 *   clueMaximum × accuracyFactor(distance)
 *
 * Integer in [0, clueMaximum]. FOUND (≤1 km) always yields clueMaximum.
 */
export function calculateFinalScore(options: {
  clueNumber: number;
  distanceMeters: number;
}): { clueMaximum: number; accuracyFactor: number; totalScore: number } {
  const clueMaximum = getClueMaxScore(options.clueNumber);
  const distanceKm = options.distanceMeters / 1000;
  const accuracyFactor = accuracyFactorFromDistanceKm(distanceKm);
  const totalScore = Math.max(
    0,
    Math.min(clueMaximum, Math.round(clueMaximum * accuracyFactor)),
  );

  return { clueMaximum, accuracyFactor, totalScore };
}
