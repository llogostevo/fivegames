import { DISTANCE_EQUALITY_TOLERANCE_METERS } from "@/lib/game/constants";
import type { Coordinates } from "@/types/coordinates";
import type { TemperatureResult } from "@/types/game";

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two coordinates in metres. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const deltaLat = toRadians(b.lat - a.lat);
  const deltaLng = toRadians(b.lng - a.lng);

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return (
    2 *
    EARTH_RADIUS_METERS *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

/**
 * Compare a new guess to the previous guess relative to the target.
 * Closer = warmer, farther = colder, within tolerance = same.
 */
export function compareGuessTemperature(
  previousGuess: Coordinates,
  nextGuess: Coordinates,
  target: Coordinates,
  toleranceMeters: number = DISTANCE_EQUALITY_TOLERANCE_METERS,
): TemperatureResult {
  const previousDistance = distanceMeters(previousGuess, target);
  const nextDistance = distanceMeters(nextGuess, target);
  const delta = nextDistance - previousDistance;

  if (Math.abs(delta) <= toleranceMeters) {
    return "same";
  }

  return delta < 0 ? "warmer" : "colder";
}
