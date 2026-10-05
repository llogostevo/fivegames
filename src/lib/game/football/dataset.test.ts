import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InvalidFootballDatasetError,
  loadFootballDataset,
  parseFootballDataset,
  resetFootballDatasetCache,
} from "./dataset";

describe("Football 92 dataset", () => {
  it("loads and validates exactly 92 clubs with unique IDs", async () => {
    resetFootballDatasetCache();
    const dataset = await loadFootballDataset();
    assert.equal(dataset.clubs.length, 92);
    assert.equal(dataset.version, 1);
    assert.ok(dataset.season.length > 0);

    const ids = dataset.clubs.map((club) => club.id);
    assert.equal(new Set(ids).size, 92);
  });

  it("requires stadium, city, division, five clues, and valid coordinates", async () => {
    const dataset = await loadFootballDataset();
    for (const club of dataset.clubs) {
      assert.ok(club.club.trim().length > 0, club.id);
      assert.ok(club.division.trim().length > 0, club.id);
      assert.ok(club.stadium.trim().length > 0, club.id);
      assert.ok(club.city.trim().length > 0, club.id);
      assert.equal(club.clues.length, 5, club.id);
      for (const clue of club.clues) {
        assert.ok(clue.trim().length > 0, club.id);
      }
      assert.ok(Number.isFinite(club.target.lat));
      assert.ok(Number.isFinite(club.target.lng));
      assert.ok(club.target.lat >= -90 && club.target.lat <= 90);
      assert.ok(club.target.lng >= -180 && club.target.lng <= 180);
    }
  });

  it("fails clearly on malformed payloads", () => {
    assert.throws(
      () => parseFootballDataset({ version: 1, season: "x", clubs: [] }),
      InvalidFootballDatasetError,
    );
    assert.throws(
      () =>
        parseFootballDataset({
          version: 1,
          season: "x",
          clubs: Array.from({ length: 92 }, (_, index) => ({
            id: `c${index}`,
            club: "Club",
            division: "PL",
            stadium: "S",
            city: "C",
            target: { lat: 51, lng: 0 },
            clues: ["a", "b", "c", "d"],
          })),
        }),
      /exactly 5/,
    );
  });
});
