import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  TAYLOR_SWIFT_COUNT,
  parseTaylorSwiftDataset,
  resetTaylorSwiftDatasetCache,
} from "./dataset";

describe("Taylor Swift dataset", () => {
  it("parses the on-disk set", async () => {
    resetTaylorSwiftDatasetCache();
    const raw = await readFile(
      path.join(
        process.cwd(),
        "data",
        "taylorswift",
        "pin5-taylor-swift.json",
      ),
      "utf8",
    );
    const dataset = parseTaylorSwiftDataset(JSON.parse(raw));
    assert.equal(dataset.locations.length, TAYLOR_SWIFT_COUNT);
    assert.ok(dataset.scope.includes("Taylor Swift"));
    assert.ok(dataset.locations.every((place) => place.clues.length === 5));
  });

  it("rejects the wrong location count", () => {
    assert.throws(
      () =>
        parseTaylorSwiftDataset({
          dataset: "x",
          scope: "x",
          locationCount: 1,
          locations: [],
        }),
      /exactly 94/,
    );
  });
});
