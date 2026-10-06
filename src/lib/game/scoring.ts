import { CLUE_COUNT } from "@/lib/game/constants";
import {
  CITY_FOUND_LOCATION_RADIUS_METRES,
  FOUND_LOCATION_RADIUS_METRES,
} from "@/lib/game/found";

/**
 * Per-mode scoring profiles.
 * Country/region games use a short accuracy decay; world-scale needs a longer one.
 */

export type ScoringProfile = {
  /** Maximum final score when finishing on each clue (length === CLUE_COUNT). */
  clueMaxScores: readonly [
    number,
    number,
    number,
    number,
    number,
  ];
  /**
   * Exponential decay length (km) for accuracy outside FOUND:
   * accuracy ≈ e^(-distanceKm / accuracyDecayLengthKm)
   */
  accuracyDecayLengthKm: number;
  /** Distance at or below which a pin is FOUND (and scores 100% accuracy). */
  foundRadiusMetres: number;
};

/** UK / single-country Football — current live curve. */
export const COUNTRY_SCORING_PROFILE: ScoringProfile = {
  clueMaxScores: [
    25_000, // Clue 1
    22_500, // Clue 2
    20_000, // Clue 3
    17_500, // Clue 4
    15_000, // Clue 5
  ],
  accuracyDecayLengthKm: 100,
  foundRadiusMetres: FOUND_LOCATION_RADIUS_METRES,
};

/**
 * World-scale profile — same ceilings, much longer decay so multi-thousand-km
 * misses can still score (wrong city / neighbouring country), while antipodal
 * guesses collapse toward zero.
 */
export const WORLD_SCORING_PROFILE: ScoringProfile = {
  clueMaxScores: [
    25_000,
    22_500,
    20_000,
    17_500,
    15_000,
  ],
  accuracyDecayLengthKm: 2_000,
  foundRadiusMetres: FOUND_LOCATION_RADIUS_METRES,
};

/**
 * City-scale profile (London pubs / stations) — same ceilings, short decay so
 * the right neighbourhood matters, and FOUND only within ~10 m of the venue.
 */
export const CITY_SCORING_PROFILE: ScoringProfile = {
  clueMaxScores: [
    25_000,
    22_500,
    20_000,
    17_500,
    15_000,
  ],
  accuracyDecayLengthKm: 5,
  foundRadiusMetres: CITY_FOUND_LOCATION_RADIUS_METRES,
};

/** @deprecated Prefer COUNTRY_SCORING_PROFILE.clueMaxScores */
export const CLUE_MAX_SCORES = COUNTRY_SCORING_PROFILE.clueMaxScores;

/** @deprecated Prefer a mode's scoring profile (or COUNTRY_SCORING_PROFILE). */
export const SCORING = {
  MAX_TOTAL_POINTS: COUNTRY_SCORING_PROFILE.clueMaxScores[0],
  ACCURACY_DECAY_LENGTH_KM: COUNTRY_SCORING_PROFILE.accuracyDecayLengthKm,
} as const;

export function maxScoreForProfile(profile: ScoringProfile): number {
  return profile.clueMaxScores[0]!;
}

/** Maximum score available when finishing on this clue number (1–5). */
export function getClueMaxScore(
  clueNumber: number,
  profile: ScoringProfile = COUNTRY_SCORING_PROFILE,
): number {
  if (
    !Number.isInteger(clueNumber) ||
    clueNumber < 1 ||
    clueNumber > CLUE_COUNT
  ) {
    throw new Error("Invalid clue number for scoring");
  }
  return profile.clueMaxScores[clueNumber - 1]!;
}

/** Next clue's maximum, or null when already on Clue 5. */
export function getNextClueMaxScore(
  clueNumber: number,
  profile: ScoringProfile = COUNTRY_SCORING_PROFILE,
): number | null {
  if (clueNumber >= CLUE_COUNT) {
    return null;
  }
  return getClueMaxScore(clueNumber + 1, profile);
}

/**
 * Accuracy factor in [0, 1] from distance in kilometres.
 *
 * Within the FOUND radius: 1 (100%).
 * Beyond that: exp(-distanceKm / decayLength).
 */
export function accuracyFactorFromDistanceKm(
  distanceKm: number,
  profile: ScoringProfile = COUNTRY_SCORING_PROFILE,
): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return 0;
  }

  const foundRadiusKm = profile.foundRadiusMetres / 1000;
  if (distanceKm <= foundRadiusKm) {
    return 1;
  }

  const raw = Math.exp(-distanceKm / profile.accuracyDecayLengthKm);
  return Math.max(0, Math.min(1, raw));
}

/**
 * Single final score:
 *   clueMaximum × accuracyFactor(distance)
 *
 * Integer in [0, clueMaximum]. FOUND always yields clueMaximum.
 */
export function calculateFinalScore(options: {
  clueNumber: number;
  distanceMeters: number;
  profile?: ScoringProfile;
}): { clueMaximum: number; accuracyFactor: number; totalScore: number } {
  const profile = options.profile ?? COUNTRY_SCORING_PROFILE;
  const clueMaximum = getClueMaxScore(options.clueNumber, profile);
  const distanceKm = options.distanceMeters / 1000;
  const accuracyFactor = accuracyFactorFromDistanceKm(distanceKm, profile);
  const totalScore = Math.max(
    0,
    Math.min(clueMaximum, Math.round(clueMaximum * accuracyFactor)),
  );

  return { clueMaximum, accuracyFactor, totalScore };
}
