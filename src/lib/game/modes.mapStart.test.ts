import assert from "node:assert/strict";
import { describe, it } from "node:test";

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

  it("opens World on a globe projection at Earth scale", () => {
    const world = GAME_MODE_DEFINITIONS.world.mapStart;
    assert.equal(world.projection, "globe");
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
