import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InvalidWorldDatasetError,
  WORLD_PLACE_COUNT,
  loadWorldDataset,
  parseWorldDataset,
  resetWorldDatasetCache,
} from "./dataset";

function stubPlace(index: number, clueCount = 5) {
  return {
    id: `p${index}`,
    name: `Place ${index}`,
    type: "city",
    region: "Europe",
    country: "Testland",
    difficulty: "easy",
    target: { lat: 51, lng: 0 },
    clues: Array.from(
      { length: clueCount },
      (_, clueIndex) => `clue-${clueIndex}`,
    ),
  };
}

describe("World dataset", () => {
  it("loads and validates exactly 314 places with unique IDs", async () => {
    resetWorldDatasetCache();
    const dataset = await loadWorldDataset();
    assert.equal(dataset.places.length, WORLD_PLACE_COUNT);
    assert.equal(dataset.count, WORLD_PLACE_COUNT);
    assert.equal(dataset.dataset, "pin5-world");

    const ids = dataset.places.map((place) => place.id);
    assert.equal(new Set(ids).size, WORLD_PLACE_COUNT);
  });

  it("requires name, country, five clues, and valid coordinates", async () => {
    const dataset = await loadWorldDataset();
    for (const place of dataset.places) {
      assert.ok(place.name.trim().length > 0, place.id);
      assert.ok(place.country.trim().length > 0, place.id);
      assert.ok(place.region.trim().length > 0, place.id);
      assert.equal(place.clues.length, 5, place.id);
      for (const clue of place.clues) {
        assert.ok(clue.trim().length > 0, place.id);
      }
      assert.ok(Number.isFinite(place.target.lat));
      assert.ok(Number.isFinite(place.target.lng));
      assert.ok(place.target.lat >= -90 && place.target.lat <= 90);
      assert.ok(place.target.lng >= -180 && place.target.lng <= 180);
    }
  });

  it("rejects the wrong place count", () => {
    assert.throws(
      () =>
        parseWorldDataset({
          dataset: "pin5-world",
          count: 2,
          places: [stubPlace(1), stubPlace(2)],
        }),
      InvalidWorldDatasetError,
    );
  });

  it("rejects duplicate ids", () => {
    const places = Array.from({ length: WORLD_PLACE_COUNT }, (_, i) =>
      stubPlace(i),
    );
    places[1] = { ...places[1]!, id: places[0]!.id };
    assert.throws(
      () =>
        parseWorldDataset({
          dataset: "pin5-world",
          count: WORLD_PLACE_COUNT,
          places,
        }),
      /duplicate place id/,
    );
  });
});
