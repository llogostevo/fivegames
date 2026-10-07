/**
 * A pin has FOUND the location when its distance is at or within this radius.
 * Country / airports use this; world-scale and city modes override via ScoringProfile.
 */
export const FOUND_LOCATION_RADIUS_METRES = 1_000;

/**
 * World / franchise places — geographic centres are soft targets (bays, cities,
 * filming regions), so FOUND is more forgiving than country modes.
 */
export const WORLD_FOUND_LOCATION_RADIUS_METRES = 10_000;

/** London pubs / stations — pin must land essentially on the venue. */
export const CITY_FOUND_LOCATION_RADIUS_METRES = 10;

/** How long the YOU FOUND IT celebration stays up before results. */
export const FOUND_CELEBRATION_DURATION_MS = 2_800;

/**
 * Authoritative FOUND threshold.
 * distanceMetres must come from the same geodesic helper used for scoring.
 *
 * With the default 1 km radius: 999 → true, 1000 → true, 1001 → false
 */
export function isFoundLocation(
  distanceMetres: number,
  foundRadiusMetres: number = FOUND_LOCATION_RADIUS_METRES,
): boolean {
  if (!Number.isFinite(distanceMetres) || distanceMetres < 0) {
    return false;
  }
  if (!Number.isFinite(foundRadiusMetres) || foundRadiusMetres < 0) {
    return false;
  }
  return distanceMetres <= foundRadiusMetres;
}
