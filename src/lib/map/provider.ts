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

/** MapLibre projection for the opening camera. */
export type MapProjection = "mercator" | "globe";

/** Opening camera for a game mode (fixed region — never the day’s answer). */
export type MapStartView = {
  center: Coordinates;
  zoom: number;
  /** Defaults to mercator when omitted. */
  projection?: MapProjection;
};

/** Fallback view when a mode does not supply mapStart (UK overview). */
export const DEFAULT_MAP_CENTER: Coordinates = {
  lat: 54.5,
  lng: -2.5,
};

export const DEFAULT_MAP_ZOOM = 5.5;

export const DEFAULT_MAP_START: MapStartView = {
  center: DEFAULT_MAP_CENTER,
  zoom: DEFAULT_MAP_ZOOM,
};

/** Whole-Earth opening view for World mode (flat Mercator — easier to pan/place). */
export const WORLD_MAP_START: MapStartView = {
  center: { lat: 20, lng: 10 },
  zoom: 1.35,
};

/** Greater London overview for London pubs — never the day’s answer. */
export const LONDON_MAP_START: MapStartView = {
  center: { lat: 51.5074, lng: -0.1278 },
  zoom: 11.2,
};

/** High enough to identify venues such as stadiums and concert halls. */
export const MAP_MAX_ZOOM = 18;
