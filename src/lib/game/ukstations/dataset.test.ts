import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  UK_RAIL_READY_COUNT,
  parseUkRailDataset,
  resetUkRailDatasetCache,
} from "./dataset";

describe("UK rail stations dataset", () => {
  it("parses every ready station in the file", async () => {
    resetUkRailDatasetCache();
    const raw = await readFile(
      path.join(
        process.cwd(),
        "data",
        "ukrailstations",
        "pin5-national-rail-stations.json",
      ),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { locations: { status: string }[] };
    assert.equal(
      parsed.locations.filter((location) => location.status === "ready").length,
      UK_RAIL_READY_COUNT,
    );

    const dataset = parseUkRailDataset(parsed);
    assert.equal(dataset.stations.length, UK_RAIL_READY_COUNT);
    assert.equal(dataset.dataset, "pin5-national-rail-stations");
    assert.ok(dataset.stations.every((station) => station.clues.length === 5));
    assert.ok(
      dataset.stations.every(
        (station) =>
          station.target.lat >= 49 &&
          station.target.lat <= 61 &&
          station.target.lng >= -8 &&
          station.target.lng <= 2,
      ),
    );
  });

  it("includes Edinburgh Waverley with its researched first clue", async () => {
    const raw = await readFile(
      path.join(
        process.cwd(),
        "data",
        "ukrailstations",
        "pin5-national-rail-stations.json",
      ),
      "utf8",
    );
    const dataset = parseUkRailDataset(JSON.parse(raw));
    const waverley = dataset.stations.find(
      (station) => station.id === "edinburgh-waverley-station",
    );
    assert.ok(waverley);
    assert.match(waverley.clues[0]!, /Walter Scott/i);
    assert.equal(waverley.clues[3], "The location is Edinburgh Waverley station.");
    assert.equal(waverley.nation, "Scotland");
  });
});
