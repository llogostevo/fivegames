import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StyleSpecification } from "maplibre-gl";

import {
  DEFAULT_MAP_LABELS,
  IDENTIFYING_LABEL_LAYER_IDS,
  DETAILED_MAP_LABELS,
  MAP_LABEL_LAYER_GROUPS,
  applyMapLabelPreset,
  setIdentifyingLabelsVisible,
  setMapLabelPreset,
  visibleLayerIdsForPreset,
} from "./style";

function fakeStyle(layerIds: string[]): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: layerIds.map((id) => ({
      id,
      type: "symbol",
      source: "openmaptiles",
      layout: { visibility: "visible" },
    })),
  } as StyleSpecification;
}

describe("map label presets", () => {
  it("maps authorable groups to the expected Liberty layer ids", () => {
    assert.ok(MAP_LABEL_LAYER_GROUPS.streets.includes("highway-name-major"));
    assert.ok(MAP_LABEL_LAYER_GROUPS.places.includes("label_city"));
    assert.ok(MAP_LABEL_LAYER_GROUPS.water.includes("water_name_line_label"));
    assert.ok(MAP_LABEL_LAYER_GROUPS.shields.includes("highway-shield-non-us"));
  });

  it("keeps only enabled groups visible for a preset", () => {
    const visible = visibleLayerIdsForPreset({
      streets: true,
      places: false,
      water: true,
      shields: false,
    });
    assert.equal(visible.has("highway-name-minor"), true);
    assert.equal(visible.has("waterway_line_label"), true);
    assert.equal(visible.has("label_city"), false);
    assert.equal(visible.has("highway-shield-non-us"), false);
    assert.equal(visible.has("poi_transit"), false);
    assert.equal(visible.has("airport"), false);
  });

  it("applies the preset onto a style document", () => {
    const style = applyMapLabelPreset(
      fakeStyle([...IDENTIFYING_LABEL_LAYER_IDS, "road_minor"]),
      DETAILED_MAP_LABELS,
    );
    const byId = new Map(
      style.layers.map((layer) => [
        "id" in layer ? layer.id : "",
        "layout" in layer ? layer.layout : undefined,
      ]),
    );
    assert.equal(
      (byId.get("highway-name-major") as { visibility?: string })?.visibility,
      "visible",
    );
    assert.equal(
      (byId.get("label_city") as { visibility?: string })?.visibility,
      "visible",
    );
    assert.equal(
      (byId.get("poi_transit") as { visibility?: string })?.visibility,
      "none",
    );
    assert.equal(
      (byId.get("airport") as { visibility?: string })?.visibility,
      "none",
    );
    // Non-identifying layers left alone (still present, still visible)
    assert.equal(
      (byId.get("road_minor") as { visibility?: string })?.visibility,
      "visible",
    );
  });

  it("defaults to a blank play map", () => {
    const visible = visibleLayerIdsForPreset(DEFAULT_MAP_LABELS);
    assert.equal(visible.size, 0);
  });

  it("toggles live map layers for preset and full reveal", () => {
    const calls: Array<[string, string]> = [];
    const layers = new Set(IDENTIFYING_LABEL_LAYER_IDS);
    const map = {
      getLayer: (id: string) => (layers.has(id as never) ? {} : undefined),
      setLayoutProperty: (
        layerId: string,
        _name: "visibility",
        value: "visible" | "none",
      ) => {
        calls.push([layerId, value]);
      },
    };

    setMapLabelPreset(map, { streets: true, places: false, water: false, shields: false });
    assert.ok(
      calls.some(
        ([id, value]) => id === "highway-name-major" && value === "visible",
      ),
    );
    assert.ok(
      calls.some(([id, value]) => id === "label_city" && value === "none"),
    );

    calls.length = 0;
    setIdentifyingLabelsVisible(map, true);
    assert.equal(calls.length, IDENTIFYING_LABEL_LAYER_IDS.length);
    assert.ok(calls.every(([, value]) => value === "visible"));
  });
});
