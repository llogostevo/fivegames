import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  InvalidFootballDatasetError,
  loadFootballDataset,
  parseFootballDataset,
  resetFootballDatasetCache,
} from "./dataset";
import { FOOTBALL_LEAGUES } from "./leagues";

function stubClub(index: number, clueCount = 5) {
  return {
    id: `c${index}`,
    club: "Club",
    division: "PL",
    stadium: "S",
    city: "C",
    target: { lat: 51, lng: 0 },
    clues: Array.from({ length: clueCount }, (_, clueIndex) => `clue-${clueIndex}`),
  };
}

describe("Football England dataset", () => {
  it("loads and validates exactly 92 clubs with unique IDs", async () => {
    resetFootballDatasetCache("england");
    const dataset = await loadFootballDataset("england");
    assert.equal(dataset.clubs.length, 92);
    assert.equal(dataset.version, 1);
    assert.ok(dataset.season.length > 0);

    const ids = dataset.clubs.map((club) => club.id);
    assert.equal(new Set(ids).size, 92);
  });

  it("requires stadium, city, division, five clues, and valid coordinates", async () => {
    const dataset = await loadFootballDataset("england");
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
      () =>
        parseFootballDataset(
          { version: 1, season: "x", clubs: [] },
          { expectedClubCount: 92 },
        ),
      InvalidFootballDatasetError,
    );
    assert.throws(
      () =>
        parseFootballDataset(
          {
            version: 1,
            season: "x",
            clubs: Array.from({ length: 92 }, (_, index) => stubClub(index, 4)),
          },
          { expectedClubCount: 92 },
        ),
      /exactly 5/,
    );
  });
});

describe("Football Italy dataset", () => {
  it("loads and validates exactly 40 clubs with unique IDs", async () => {
    resetFootballDatasetCache("italy");
    const dataset = await loadFootballDataset("italy");
    assert.equal(
      dataset.clubs.length,
      FOOTBALL_LEAGUES.italy.expectedClubCount,
    );
    assert.equal(dataset.version, 1);
    assert.ok(dataset.season.length > 0);

    const ids = dataset.clubs.map((club) => club.id);
    assert.equal(new Set(ids).size, 40);
  });

  it("requires stadium, city, division, five clues, and valid coordinates", async () => {
    const dataset = await loadFootballDataset("italy");
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

  it("rejects wrong club counts", () => {
    assert.throws(
      () =>
        parseFootballDataset(
          {
            season: "2026-27",
            clubs: Array.from({ length: 39 }, (_, index) => stubClub(index)),
          },
          { expectedClubCount: 40, label: "Football Italy" },
        ),
      /expected exactly 40/,
    );
  });
});

describe("Football Germany dataset", () => {
  it("loads and validates exactly 36 clubs with unique IDs", async () => {
    resetFootballDatasetCache("germany");
    const dataset = await loadFootballDataset("germany");
    assert.equal(
      dataset.clubs.length,
      FOOTBALL_LEAGUES.germany.expectedClubCount,
    );
    assert.equal(dataset.version, 1);
    assert.ok(dataset.season.length > 0);

    const ids = dataset.clubs.map((club) => club.id);
    assert.equal(new Set(ids).size, 36);
  });

  it("requires stadium, city, division, five clues, and valid coordinates", async () => {
    const dataset = await loadFootballDataset("germany");
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
});

describe("Football France dataset", () => {
  it("loads and validates exactly 36 clubs with unique IDs", async () => {
    resetFootballDatasetCache("france");
    const dataset = await loadFootballDataset("france");
    assert.equal(
      dataset.clubs.length,
      FOOTBALL_LEAGUES.france.expectedClubCount,
    );
    assert.equal(dataset.version, 1);
    assert.ok(dataset.season.length > 0);

    const ids = dataset.clubs.map((club) => club.id);
    assert.equal(new Set(ids).size, 36);
  });

  it("requires stadium, city, division, five clues, and valid coordinates", async () => {
    const dataset = await loadFootballDataset("france");
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
});

describe("Football Spain dataset", () => {
  it("loads and validates exactly 42 clubs with unique IDs", async () => {
    resetFootballDatasetCache("spain");
    const dataset = await loadFootballDataset("spain");
    assert.equal(
      dataset.clubs.length,
      FOOTBALL_LEAGUES.spain.expectedClubCount,
    );
    assert.equal(dataset.version, 1);
    assert.ok(dataset.season.length > 0);

    const ids = dataset.clubs.map((club) => club.id);
    assert.equal(new Set(ids).size, 42);
  });

  it("requires stadium, city, division, five clues, and valid coordinates", async () => {
    const dataset = await loadFootballDataset("spain");
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
});
