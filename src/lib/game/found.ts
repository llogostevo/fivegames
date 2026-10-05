/**
 * A pin has FOUND the location when its distance is at or within this radius.
 * Tune here only — do not scatter the metre value elsewhere.
 */
export const FOUND_LOCATION_RADIUS_METRES = 1_000;

/** How long the YOU FOUND IT celebration stays up before results. */
export const FOUND_CELEBRATION_DURATION_MS = 2_800;

/**
 * Authoritative FOUND threshold.
 * distanceMetres must come from the same geodesic helper used for scoring.
 *
 * 999 → true, 1000 → true, 1001 → false
 */
export function isFoundLocation(distanceMetres: number): boolean {
  if (!Number.isFinite(distanceMetres) || distanceMetres < 0) {
    return false;
  }
  return distanceMetres <= FOUND_LOCATION_RADIUS_METRES;
}
