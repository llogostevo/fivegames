import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  MARVEL_COUNT,
  parseMarvelDataset,
  resetMarvelDatasetCache,
} from "./dataset";

describe("Marvel dataset", () => {
  it("parses the on-disk set", async () => {
    resetMarvelDatasetCache();
    const raw = await readFile(
      path.join(process.cwd(), "data", "marvel", "pin5-marvel.json"),
      "utf8",
    );
    const dataset = parseMarvelDataset(JSON.parse(raw));
    assert.equal(dataset.locations.length, MARVEL_COUNT);
    assert.ok(dataset.scope.toLowerCase().includes("marvel"));
    assert.ok(dataset.locations.every((place) => place.clues.length === 5));
  });

  it("rejects the wrong location count", () => {
    assert.throws(
      () =>
        parseMarvelDataset({
          dataset: "x",
          scope: "x",
          locationCount: 1,
          locations: [],
        }),
      /exactly 203/,
    );
  });
});
