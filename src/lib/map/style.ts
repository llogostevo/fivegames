import type { StyleSpecification } from "maplibre-gl";

import { MAP_STYLE_URL } from "@/lib/map/provider";

export type MapStyleOptions = {
  /**
   * Gameplay mode hides place names, POIs, road names, and other
   * identifying labels while keeping geographical map features.
   * Set to false later for a labelled “reveal” map.
   */
  gameMode?: boolean;
};

/**
 * OpenFreeMap Liberty symbol layers that identify locations.
 * Deliberately excludes non-text cartographic symbols such as one-way arrows.
 */
export const IDENTIFYING_LABEL_LAYER_IDS = [
  // Named water features
  "waterway_line_label",
  "water_name_point_label",
  "water_name_line_label",
  // POIs / venues / transit / businesses
  "poi_r20",
  "poi_r7",
  "poi_r1",
  "poi_transit",
  // Road and street names
  "highway-name-path",
  "highway-name-minor",
  "highway-name-major",
  // Highway shields / route numbers
  "highway-shield-non-us",
  "highway-shield-us-interstate",
  "road_shield_us",
  // Airports
  "airport",
  // Place labels
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

type IdentifyingLabelLayerId = (typeof IDENTIFYING_LABEL_LAYER_IDS)[number];

const IDENTIFYING_LABEL_LAYER_ID_SET = new Set<string>(
  IDENTIFYING_LABEL_LAYER_IDS,
);

function isIdentifyingLabelLayerId(
  layerId: string,
): layerId is IdentifyingLabelLayerId {
  return IDENTIFYING_LABEL_LAYER_ID_SET.has(layerId);
}

/**
 * Mutate a style so identifying label/POI layers are hidden or shown.
 */
export function applyGameModeToStyle(
  style: StyleSpecification,
  gameMode: boolean,
): StyleSpecification {
  if (!gameMode) {
    return style;
  }

  return {
    ...style,
    layers: style.layers.map((layer) => {
      if (!("id" in layer) || !isIdentifyingLabelLayerId(layer.id)) {
        return layer;
      }

      return {
        ...layer,
        layout: {
          ...("layout" in layer ? layer.layout : undefined),
          visibility: "none",
        },
      };
    }),
  };
}

/**
 * Load the configured map style, optionally with gameplay labels removed.
 */
export async function loadMapStyle(
  options: MapStyleOptions = {},
): Promise<StyleSpecification> {
  const { gameMode = true } = options;

  const response = await fetch(MAP_STYLE_URL);
  if (!response.ok) {
    throw new Error(
      `Failed to load map style (${response.status}): ${MAP_STYLE_URL}`,
    );
  }

  const style = (await response.json()) as StyleSpecification;
  return applyGameModeToStyle(style, gameMode);
}

type MapLike = {
  getLayer: (id: string) => unknown;
  setLayoutProperty: (
    layerId: string,
    name: "visibility",
    value: "visible" | "none",
  ) => unknown;
};

/**
 * Toggle identifying labels on a live map instance (for future reveal mode).
 */
export function setIdentifyingLabelsVisible(
  map: MapLike,
  visible: boolean,
): void {
  const visibility = visible ? "visible" : "none";

  for (const layerId of IDENTIFYING_LABEL_LAYER_IDS) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }
}
