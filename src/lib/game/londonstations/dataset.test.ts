import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  LONDON_STATIONS_COUNT,
  cluesForStation,
  parseLondonStationsDataset,
  provisionalStationClues,
  resetLondonStationsDatasetCache,
} from "./dataset";

describe("London stations dataset", () => {
  it("parses the on-disk inventory", async () => {
    resetLondonStationsDatasetCache();
    const raw = await readFile(
      path.join(
        process.cwd(),
        "data",
        "londonstations",
        "pin5-london-stations.json",
      ),
      "utf8",
    );
    const dataset = parseLondonStationsDataset(JSON.parse(raw));
    assert.equal(dataset.stations.length, LONDON_STATIONS_COUNT);
    assert.equal(dataset.region, "Greater London");
    assert.ok(dataset.stations.every((station) => station.modes.length > 0));
  });

  it("supplies provisional clues when researched clues are empty", () => {
    const clues = provisionalStationClues({
      id: "abbey-road",
      station: "Abbey Road",
      borough: "Newham",
      modes: ["DLR"],
      target: { lat: 51.53, lng: 0.0 },
      clues: [],
    });
    assert.equal(clues.length, 5);
    assert.match(clues[3]!, /Abbey Road/);
    assert.equal(
      cluesForStation({
        id: "abbey-road",
        station: "Abbey Road",
        borough: "Newham",
        modes: ["DLR"],
        target: { lat: 51.53, lng: 0.0 },
        clues: [],
      }).length,
      5,
    );
  });

  it("rejects the wrong station count", () => {
    assert.throws(
      () =>
        parseLondonStationsDataset({
          dataset: "x",
          region: "Greater London",
          stationCount: 1,
          stations: [],
        }),
      /exactly 470/,
    );
  });
});
