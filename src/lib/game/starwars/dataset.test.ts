import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  STAR_WARS_COUNT,
  parseStarWarsDataset,
  resetStarWarsDatasetCache,
} from "./dataset";

describe("Star Wars dataset", () => {
  it("parses the on-disk set", async () => {
    resetStarWarsDatasetCache();
    const raw = await readFile(
      path.join(process.cwd(), "data", "starwars", "pin5-star-wars.json"),
      "utf8",
    );
    const dataset = parseStarWarsDataset(JSON.parse(raw));
    assert.equal(dataset.locations.length, STAR_WARS_COUNT);
    assert.ok(dataset.scope.toLowerCase().includes("star wars"));
    assert.ok(dataset.locations.every((place) => place.clues.length === 5));
  });

  it("rejects the wrong location count", () => {
    assert.throws(
      () =>
        parseStarWarsDataset({
          dataset: "x",
          scope: "x",
          locationCount: 1,
          locations: [],
        }),
      /exactly 145/,
    );
  });
});
