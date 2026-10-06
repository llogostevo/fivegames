import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  LONDON_PUBS_COUNT,
  parseLondonPubsDataset,
  resetLondonPubsDatasetCache,
} from "./dataset";

describe("London pubs dataset", () => {
  it("parses the on-disk starter set", async () => {
    resetLondonPubsDatasetCache();
    const raw = await readFile(
      path.join(process.cwd(), "data", "londonpubs", "pin5-london-pubs.json"),
      "utf8",
    );
    const dataset = parseLondonPubsDataset(JSON.parse(raw));
    assert.equal(dataset.pubs.length, LONDON_PUBS_COUNT);
    assert.equal(dataset.region, "London");
    assert.ok(dataset.pubs.every((pub) => pub.clues.length === 5));
  });

  it("rejects the wrong pub count", () => {
    assert.throws(
      () =>
        parseLondonPubsDataset({
          dataset: "x",
          region: "London",
          pubCount: 1,
          pubs: [],
        }),
      /exactly 107/,
    );
  });
});
