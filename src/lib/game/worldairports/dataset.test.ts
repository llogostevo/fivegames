import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  WORLD_AIRPORTS_COUNT,
  parseWorldAirportsDataset,
  resetWorldAirportsDatasetCache,
} from "./dataset";

describe("World airports dataset", () => {
  it("parses the on-disk inventory with full clues", async () => {
    resetWorldAirportsDatasetCache();
    const raw = await readFile(
      path.join(process.cwd(), "data", "worldairports", "pin5-airports.json"),
      "utf8",
    );
    const dataset = parseWorldAirportsDataset(JSON.parse(raw));
    assert.equal(dataset.airports.length, WORLD_AIRPORTS_COUNT);
    assert.ok(dataset.airports.every((airport) => airport.clues.length === 5));
    assert.ok(dataset.airports.every((airport) => airport.iata.length === 3));
  });

  it("rejects the wrong airport count", () => {
    assert.throws(
      () =>
        parseWorldAirportsDataset({
          dataset: "x",
          airportCount: 1,
          airports: [],
        }),
      /exactly 890/,
    );
  });
});
