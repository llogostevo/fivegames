import type { Coordinates } from "@/types/coordinates";

/**
 * Map style / tile provider configuration.
 * Keep provider details here so game components can swap sources later
 * without changing map interaction or game logic.
 */

/**
 * Free OpenStreetMap-based style for local development (OpenFreeMap Liberty).
 * Vector OpenMapTiles source plus a Natural Earth raster basemap at low zoom.
 * Label visibility is controlled in `src/lib/map/style.ts`.
 */
export const MAP_STYLE_URL =
  "https://tiles.openfreemap.org/styles/liberty";

/** Temporary default view: UK and surrounding area. */
export const DEFAULT_MAP_CENTER: Coordinates = {
  lat: 54.5,
  lng: -2.5,
};

export const DEFAULT_MAP_ZOOM = 5.5;

/** High enough to identify venues such as stadiums and concert halls. */
export const MAP_MAX_ZOOM = 18;
