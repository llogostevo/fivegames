import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  HARRY_POTTER_COUNT,
  parseHarryPotterDataset,
  resetHarryPotterDatasetCache,
} from "./dataset";

describe("Harry Potter dataset", () => {
  it("parses the on-disk set", async () => {
    resetHarryPotterDatasetCache();
    const raw = await readFile(
      path.join(
        process.cwd(),
        "data",
        "harrypotter",
        "pin5-harry-potter.json",
      ),
      "utf8",
    );
    const dataset = parseHarryPotterDataset(JSON.parse(raw));
    assert.equal(dataset.locations.length, HARRY_POTTER_COUNT);
    assert.ok(dataset.scope.includes("Harry Potter"));
    assert.ok(dataset.locations.every((place) => place.clues.length === 5));
  });

  it("rejects the wrong location count", () => {
    assert.throws(
      () =>
        parseHarryPotterDataset({
          dataset: "x",
          scope: "x",
          locationCount: 1,
          locations: [],
        }),
      /exactly 185/,
    );
  });
});
