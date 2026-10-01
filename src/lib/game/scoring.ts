/**
 * Guess scoring configuration.
 * Tune these values after play-testing — do not scatter scoring magic numbers elsewhere.
 */
export const SCORING = {
  /** Maximum points for a single locked guess. */
  MAX_POINTS_PER_GUESS: 5_000,

  /** Maximum total for a five-guess game. */
  MAX_TOTAL_POINTS: 25_000,

  /**
   * Exponential decay length in kilometres.
   * Score ≈ MAX * e^(-distanceKm / DECAY_LENGTH_KM).
   * At this distance the score is about 36.8% of the maximum (1/e).
   */
  DECAY_LENGTH_KM: 100,

  /**
   * Distances at or below this (km) score a perfect MAX_POINTS_PER_GUESS.
   * 0.05 km = 50 metres.
   */
  PERFECT_DISTANCE_KM: 0.05,
} as const;

/**
 * Score a guess from its distance to the target.
 *
 * Uses smooth exponential decay so small differences near the target matter
 * more than similar differences between very distant guesses.
 *
 * Always returns an integer in [0, MAX_POINTS_PER_GUESS].
 */
export function calculateScore(distanceKm: number): number {
  const { MAX_POINTS_PER_GUESS, DECAY_LENGTH_KM, PERFECT_DISTANCE_KM } =
    SCORING;

  if (!Number.isFinite(distanceKm) || distanceKm <= PERFECT_DISTANCE_KM) {
    // Non-finite / negative distances are treated as a perfect hit so the
    // function never returns an invalid out-of-range score.
    return MAX_POINTS_PER_GUESS;
  }

  const raw =
    MAX_POINTS_PER_GUESS * Math.exp(-distanceKm / DECAY_LENGTH_KM);

  return Math.max(0, Math.min(MAX_POINTS_PER_GUESS, Math.round(raw)));
}
