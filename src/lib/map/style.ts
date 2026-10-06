import type { StyleSpecification } from "maplibre-gl";

import { MAP_STYLE_URL } from "@/lib/map/provider";

/**
 * Play-time identifying label toggles (authorable per mode).
 * POI + airport layers are not exposed here — always hidden during play,
 * restored on reveal with the rest of the identifying layers.
 */
export type MapLabelPreset = {
  streets: boolean;
  places: boolean;
  water: boolean;
  shields: boolean;
};

export const DEFAULT_MAP_LABELS: MapLabelPreset = {
  streets: false,
  places: false,
  water: false,
  shields: false,
};

/** Street-level / local detail during play (all authorable label groups on). */
export const DETAILED_MAP_LABELS: MapLabelPreset = {
  streets: true,
  places: true,
  water: true,
  shields: true,
};

/** Streets + named water only — no place names or route shields. */
export const STREETS_WATER_MAP_LABELS: MapLabelPreset = {
  streets: true,
  places: false,
  water: true,
  shields: false,
};

/** Street names only during play. */
export const STREETS_ONLY_MAP_LABELS: MapLabelPreset = {
  streets: true,
  places: false,
  water: false,
  shields: false,
};

export type MapStyleOptions = {
  /**
   * When true (default), apply `mapLabels` (and hide POI/airport layers).
   * When false, leave the style’s labels untouched (full basemap).
   */
  gameMode?: boolean;
  /** Which authorable label groups stay visible during play. */
  mapLabels?: MapLabelPreset;
};

const STREET_LABEL_LAYER_IDS = [
  "highway-name-path",
  "highway-name-minor",
  "highway-name-major",
] as const;

const PLACE_LABEL_LAYER_IDS = [
  "label_other",
  "label_village",
  "label_town",
  "label_state",
  "label_city",
  "label_city_capital",
  "label_country_3",
  "label_country_2",
  "label_country_1",
] as const;

const WATER_LABEL_LAYER_IDS = [
  "waterway_line_label",
  "water_name_point_label",
  "water_name_line_label",
] as const;

const SHIELD_LABEL_LAYER_IDS = [
  "highway-shield-non-us",
  "highway-shield-us-interstate",
  "road_shield_us",
] as const;

/** Always hidden during play; restored on full reveal. */
const PLAY_ALWAYS_HIDDEN_LAYER_IDS = [
  "poi_r20",
  "poi_r7",
  "poi_r1",
  "poi_transit",
  "airport",
] as const;

export const MAP_LABEL_LAYER_GROUPS = {
  streets: STREET_LABEL_LAYER_IDS,
  places: PLACE_LABEL_LAYER_IDS,
  water: WATER_LABEL_LAYER_IDS,
  shields: SHIELD_LABEL_LAYER_IDS,
} as const;

/**
 * OpenFreeMap Liberty symbol layers that identify locations.
 * Deliberately excludes non-text cartographic symbols such as one-way arrows.
 */
export const IDENTIFYING_LABEL_LAYER_IDS = [
  ...WATER_LABEL_LAYER_IDS,
  ...PLAY_ALWAYS_HIDDEN_LAYER_IDS,
  ...STREET_LABEL_LAYER_IDS,
  ...SHIELD_LABEL_LAYER_IDS,
  ...PLACE_LABEL_LAYER_IDS,
] as const;

type IdentifyingLabelLayerId = (typeof IDENTIFYING_LABEL_LAYER_IDS)[number];

const IDENTIFYING_LABEL_LAYER_ID_SET = new Set<string>(
  IDENTIFYING_LABEL_LAYER_IDS,
);

function isIdentifyingLabelLayerId(
  layerId: string,
): layerId is IdentifyingLabelLayerId {
  return IDENTIFYING_LABEL_LAYER_ID_SET.has(layerId);
}

function normalizeMapLabels(
  preset: MapLabelPreset | undefined,
): MapLabelPreset {
  return {
    streets: Boolean(preset?.streets),
    places: Boolean(preset?.places),
    water: Boolean(preset?.water),
    shields: Boolean(preset?.shields),
  };
}

/** Layer ids that should be visible for a play-time preset. */
export function visibleLayerIdsForPreset(
  preset: MapLabelPreset,
): Set<string> {
  const labels = normalizeMapLabels(preset);
  const visible = new Set<string>();
  if (labels.streets) {
    for (const id of STREET_LABEL_LAYER_IDS) visible.add(id);
  }
  if (labels.places) {
    for (const id of PLACE_LABEL_LAYER_IDS) visible.add(id);
  }
  if (labels.water) {
    for (const id of WATER_LABEL_LAYER_IDS) visible.add(id);
  }
  if (labels.shields) {
    for (const id of SHIELD_LABEL_LAYER_IDS) visible.add(id);
  }
  return visible;
}

function withLayerVisibility(
  style: StyleSpecification,
  visibilityForLayer: (layerId: string) => "visible" | "none" | null,
): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (!("id" in layer)) {
        return layer;
      }
      const visibility = visibilityForLayer(layer.id);
      if (visibility === null) {
        return layer;
      }
      return {
        ...layer,
        layout: {
          ...("layout" in layer ? layer.layout : undefined),
          visibility,
        },
      };
    }),
  };
}

/**
 * Apply play-time label visibility to a style document.
 * Authorable groups follow `mapLabels`; POI/airport layers are always hidden.
 */
export function applyMapLabelPreset(
  style: StyleSpecification,
  preset: MapLabelPreset = DEFAULT_MAP_LABELS,
): StyleSpecification {
  const visible = visibleLayerIdsForPreset(preset);
  return withLayerVisibility(style, (layerId) => {
    if (!isIdentifyingLabelLayerId(layerId)) {
      return null;
    }
    return visible.has(layerId) ? "visible" : "none";
  });
}

/**
 * Legacy helper: hide every identifying layer (blank play map).
 */
export function applyGameModeToStyle(
  style: StyleSpecification,
  gameMode: boolean,
): StyleSpecification {
  if (!gameMode) {
    return style;
  }
  return applyMapLabelPreset(style, DEFAULT_MAP_LABELS);
}

/**
 * Load the configured map style, optionally with gameplay labels filtered.
 */
export async function loadMapStyle(
  options: MapStyleOptions = {},
): Promise<StyleSpecification> {
  const { gameMode = true, mapLabels = DEFAULT_MAP_LABELS } = options;

  const response = await fetch(MAP_STYLE_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to load map style (${response.status}): ${MAP_STYLE_URL}`,
    );
  }

  const style = (await response.json()) as StyleSpecification;
  if (!gameMode) {
    return style;
  }
  return applyMapLabelPreset(style, mapLabels);
}

type MapLike = {
  getLayer: (id: string) => unknown;
  setLayoutProperty: (
    layerId: string,
    name: "visibility",
    value: "visible" | "none",
  ) => unknown;
};

/** Apply a play-time label preset on a live map. */
export function setMapLabelPreset(
  map: MapLike,
  preset: MapLabelPreset,
): void {
  const visible = visibleLayerIdsForPreset(preset);
  for (const layerId of IDENTIFYING_LABEL_LAYER_IDS) {
    if (!map.getLayer(layerId)) {
      continue;
    }
    map.setLayoutProperty(
      layerId,
      "visibility",
      visible.has(layerId) ? "visible" : "none",
    );
  }
}

/**
 * Toggle all identifying labels on a live map (reveal mode).
 */
export function setIdentifyingLabelsVisible(
  map: MapLike,
  visible: boolean,
): void {
  if (visible) {
    for (const layerId of IDENTIFYING_LABEL_LAYER_IDS) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", "visible");
      }
    }
    return;
  }
  setMapLabelPreset(map, DEFAULT_MAP_LABELS);
}
