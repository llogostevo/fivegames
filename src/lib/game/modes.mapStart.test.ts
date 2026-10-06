import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DETAILED_MAP_LABELS,
  STREETS_ONLY_MAP_LABELS,
  STREETS_WATER_MAP_LABELS,
} from "@/lib/map/style";

import {
  GAME_MODES,
  GAME_MODE_DEFINITIONS,
  getModeDefinition,
} from "./modes";

describe("mode map starts", () => {
  it("defines a finite opening camera for every mode", () => {
    for (const mode of GAME_MODES) {
      const { mapStart } = getModeDefinition(mode);
      assert.ok(Number.isFinite(mapStart.center.lat), mode);
      assert.ok(Number.isFinite(mapStart.center.lng), mode);
      assert.ok(Number.isFinite(mapStart.zoom), mode);
      assert.ok(mapStart.zoom > 0, mode);
      assert.ok(mapStart.center.lat >= -90 && mapStart.center.lat <= 90, mode);
      assert.ok(mapStart.center.lng >= -180 && mapStart.center.lng <= 180, mode);
    }
  });

  it("opens World at Earth scale on a flat map", () => {
    const world = GAME_MODE_DEFINITIONS.world.mapStart;
    assert.notEqual(world.projection, "globe");
    assert.ok(world.zoom < 3);
  });

  it("keeps football opening views distinct from each other", () => {
    const england = GAME_MODE_DEFINITIONS.football.mapStart;
    const italy = GAME_MODE_DEFINITIONS["football-italy"].mapStart;
    const germany = GAME_MODE_DEFINITIONS["football-germany"].mapStart;
    const france = GAME_MODE_DEFINITIONS["football-france"].mapStart;
    const spain = GAME_MODE_DEFINITIONS["football-spain"].mapStart;

    const keys = [england, italy, germany, france, spain].map(
      (view) => `${view.center.lat},${view.center.lng},${view.zoom}`,
    );
    assert.equal(new Set(keys).size, keys.length);
  });

  it("frames Italy east of the UK and Spain south of France", () => {
    const daily = GAME_MODE_DEFINITIONS.daily.mapStart;
    const italy = GAME_MODE_DEFINITIONS["football-italy"].mapStart;
    const france = GAME_MODE_DEFINITIONS["football-france"].mapStart;
    const spain = GAME_MODE_DEFINITIONS["football-spain"].mapStart;

    assert.ok(italy.center.lng > daily.center.lng);
    assert.ok(spain.center.lat < france.center.lat);
  });
});

describe("mode map labels", () => {
  it("defines a label preset for every mode", () => {
    for (const mode of GAME_MODES) {
      const { mapLabels } = getModeDefinition(mode);
      assert.equal(typeof mapLabels.streets, "boolean", mode);
      assert.equal(typeof mapLabels.places, "boolean", mode);
      assert.equal(typeof mapLabels.water, "boolean", mode);
      assert.equal(typeof mapLabels.shields, "boolean", mode);
    }
  });

  it("enables street-level detail for London pubs and franchise games", () => {
    for (const mode of [
      "london-pubs",
      "london-stations",
      "taylor-swift",
      "harry-potter",
      "marvel",
      "star-wars",
    ] as const) {
      assert.deepEqual(
        GAME_MODE_DEFINITIONS[mode].mapLabels,
        DETAILED_MAP_LABELS,
        mode,
      );
    }
  });

  it("keeps UK Daily, World, and Airports to street names only", () => {
    assert.deepEqual(
      GAME_MODE_DEFINITIONS.daily.mapLabels,
      STREETS_ONLY_MAP_LABELS,
    );
    assert.deepEqual(
      GAME_MODE_DEFINITIONS.world.mapLabels,
      STREETS_ONLY_MAP_LABELS,
    );
    assert.deepEqual(
      GAME_MODE_DEFINITIONS["world-airports"].mapLabels,
      STREETS_ONLY_MAP_LABELS,
    );
  });

  it("shows streets and water but not place names for football", () => {
    for (const mode of [
      "football",
      "football-italy",
      "football-germany",
      "football-france",
      "football-spain",
    ] as const) {
      assert.deepEqual(
        GAME_MODE_DEFINITIONS[mode].mapLabels,
        STREETS_WATER_MAP_LABELS,
        mode,
      );
    }
  });
});
