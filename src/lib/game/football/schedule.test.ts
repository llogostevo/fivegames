import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getAvailableGameDate,
  londonWallTimeToUtc,
} from "@/lib/game/date";

import {
  FOOTBALL_SCHEDULE,
  footballCycleIndex,
  orderFootballClubIds,
} from "./schedule";
import { FOOTBALL_LEAGUES } from "./leagues";
import {
  getFootballGameByDate,
  getReleasedFootballGameByDate,
  getTodaysFootballGame,
  resetFootballScheduleCache,
} from "./loadFootballGame";
import { loadFootballDataset, resetFootballDatasetCache } from "./dataset";

describe("Football England schedule", () => {
  it("resolves the same club for the same date across calls", async () => {
    resetFootballDatasetCache("england");
    resetFootballScheduleCache("england");
    const first = await getFootballGameByDate("2026-09-28", "england");
    const second = await getFootballGameByDate("2026-09-28", "england");
    assert.equal(first.answer.name, second.answer.name);
    assert.equal(first.answerDetail?.clubId, second.answerDetail?.clubId);
    assert.equal(first.mode, "football");
  });

  it("advances to a different club on consecutive dates", async () => {
    const day1 = await getFootballGameByDate("2026-09-28", "england");
    const day2 = await getFootballGameByDate("2026-09-29", "england");
    assert.notEqual(day1.answerDetail?.clubId, day2.answerDetail?.clubId);
    assert.equal(day1.gameNumber + 1, day2.gameNumber);
  });

  it("does not repeat any club during a 92-day cycle", async () => {
    const dataset = await loadFootballDataset("england");
    const ordered = orderFootballClubIds(
      dataset.clubs.map((club) => club.id),
      FOOTBALL_SCHEDULE.seed,
    );
    assert.equal(ordered.length, 92);
    assert.equal(new Set(ordered).size, 92);

    const seen = new Set<string>();
    for (let offset = 0; offset < 92; offset += 1) {
      const date = new Date(Date.UTC(2026, 8, 28 + offset))
        .toISOString()
        .slice(0, 10);
      const index = footballCycleIndex(date);
      const clubId = ordered[index]!;
      assert.equal(seen.has(clubId), false, `repeat ${clubId} on ${date}`);
      seen.add(clubId);
    }
    assert.equal(seen.size, 92);
  });

  it("cycles after day 92 back to the first club", async () => {
    const first = await getFootballGameByDate("2026-09-28", "england");
    // 92 days later = same cycle index 0
    const afterCycle = await getFootballGameByDate("2026-12-29", "england");
    assert.equal(footballCycleIndex("2026-12-29"), 0);
    assert.equal(first.answerDetail?.clubId, afterCycle.answerDetail?.clubId);
  });

  it("pre/post 08:00 Europe/London release works", async () => {
    const before = londonWallTimeToUtc("2026-10-01", 7, 59);
    assert.equal(getAvailableGameDate(before, { now: before }), "2026-09-30");
    const yesterday = await getTodaysFootballGame(before, { now: before });
    assert.equal(yesterday.id, "2026-09-30");

    await assert.rejects(
      () =>
        getReleasedFootballGameByDate("2026-10-01", before, { now: before }),
    );

    const at = londonWallTimeToUtc("2026-10-01", 8, 0);
    const today = await getTodaysFootballGame(at, { now: at });
    assert.equal(today.id, "2026-10-01");
    const released = await getReleasedFootballGameByDate(
      "2026-10-01",
      at,
      { now: at },
    );
    assert.equal(released.id, "2026-10-01");
  });

  it("keeps ordering stable for a fixed seed", () => {
    const ids = Array.from({ length: 92 }, (_, index) => `club-${index}`);
    const a = orderFootballClubIds(ids, "pin5-football92-v1");
    const b = orderFootballClubIds(ids, "pin5-football92-v1");
    assert.deepEqual(a, b);
    const reseeds = orderFootballClubIds(ids, "pin5-football92-v2");
    assert.notDeepEqual(a, reseeds);
  });
});

describe("Football Italy schedule", () => {
  it("resolves Italy games with football-italy mode", async () => {
    resetFootballDatasetCache("italy");
    resetFootballScheduleCache("italy");
    const game = await getFootballGameByDate("2026-09-28", "italy");
    assert.equal(game.mode, "football-italy");
    assert.equal(game.theme, "football");
    assert.ok(game.answerDetail?.stadium);
    assert.ok(game.answerDetail?.city);
  });

  it("does not repeat any club during a 40-day cycle", async () => {
    const league = FOOTBALL_LEAGUES.italy;
    const dataset = await loadFootballDataset("italy");
    const ordered = orderFootballClubIds(
      dataset.clubs.map((club) => club.id),
      league.schedule.seed,
    );
    assert.equal(ordered.length, 40);
    assert.equal(new Set(ordered).size, 40);

    const seen = new Set<string>();
    for (let offset = 0; offset < 40; offset += 1) {
      const date = new Date(Date.UTC(2026, 8, 28 + offset))
        .toISOString()
        .slice(0, 10);
      const index = footballCycleIndex(date, {
        cycleStartDate: league.schedule.cycleStartDate,
        clubCount: 40,
      });
      const clubId = ordered[index]!;
      assert.equal(seen.has(clubId), false, `repeat ${clubId} on ${date}`);
      seen.add(clubId);
    }
    assert.equal(seen.size, 40);
  });

  it("cycles after day 40 back to the first club", async () => {
    const first = await getFootballGameByDate("2026-09-28", "italy");
    const afterCycle = await getFootballGameByDate("2026-11-07", "italy");
    assert.equal(
      footballCycleIndex("2026-11-07", {
        cycleStartDate: FOOTBALL_LEAGUES.italy.schedule.cycleStartDate,
        clubCount: 40,
      }),
      0,
    );
    assert.equal(first.answerDetail?.clubId, afterCycle.answerDetail?.clubId);
  });

  it("keeps England and Italy answers independent on the same date", async () => {
    const england = await getFootballGameByDate("2026-09-28", "england");
    const italy = await getFootballGameByDate("2026-09-28", "italy");
    assert.equal(england.mode, "football");
    assert.equal(italy.mode, "football-italy");
    assert.notEqual(england.answerDetail?.clubId, italy.answerDetail?.clubId);
  });
});

describe("Football Germany schedule", () => {
  it("resolves Germany games with football-germany mode", async () => {
    resetFootballDatasetCache("germany");
    resetFootballScheduleCache("germany");
    const game = await getFootballGameByDate("2026-09-28", "germany");
    assert.equal(game.mode, "football-germany");
    assert.equal(game.theme, "football");
    assert.ok(game.answerDetail?.stadium);
    assert.ok(game.answerDetail?.city);
  });

  it("does not repeat any club during a 36-day cycle", async () => {
    const league = FOOTBALL_LEAGUES.germany;
    const dataset = await loadFootballDataset("germany");
    const ordered = orderFootballClubIds(
      dataset.clubs.map((club) => club.id),
      league.schedule.seed,
    );
    assert.equal(ordered.length, 36);
    assert.equal(new Set(ordered).size, 36);

    const seen = new Set<string>();
    for (let offset = 0; offset < 36; offset += 1) {
      const date = new Date(Date.UTC(2026, 8, 28 + offset))
        .toISOString()
        .slice(0, 10);
      const index = footballCycleIndex(date, {
        cycleStartDate: league.schedule.cycleStartDate,
        clubCount: 36,
      });
      const clubId = ordered[index]!;
      assert.equal(seen.has(clubId), false, `repeat ${clubId} on ${date}`);
      seen.add(clubId);
    }
    assert.equal(seen.size, 36);
  });

  it("cycles after day 36 back to the first club", async () => {
    const first = await getFootballGameByDate("2026-09-28", "germany");
    const afterCycle = await getFootballGameByDate("2026-11-03", "germany");
    assert.equal(
      footballCycleIndex("2026-11-03", {
        cycleStartDate: FOOTBALL_LEAGUES.germany.schedule.cycleStartDate,
        clubCount: 36,
      }),
      0,
    );
    assert.equal(first.answerDetail?.clubId, afterCycle.answerDetail?.clubId);
  });

  it("keeps Germany independent from England and Italy on the same date", async () => {
    const england = await getFootballGameByDate("2026-09-28", "england");
    const italy = await getFootballGameByDate("2026-09-28", "italy");
    const germany = await getFootballGameByDate("2026-09-28", "germany");
    assert.equal(germany.mode, "football-germany");
    assert.notEqual(germany.answerDetail?.clubId, england.answerDetail?.clubId);
    assert.notEqual(germany.answerDetail?.clubId, italy.answerDetail?.clubId);
  });
});

describe("Football France schedule", () => {
  it("resolves France games with football-france mode", async () => {
    resetFootballDatasetCache("france");
    resetFootballScheduleCache("france");
    const game = await getFootballGameByDate("2026-09-28", "france");
    assert.equal(game.mode, "football-france");
    assert.equal(game.theme, "football");
    assert.ok(game.answerDetail?.stadium);
    assert.ok(game.answerDetail?.city);
  });

  it("does not repeat any club during a 36-day cycle", async () => {
    const league = FOOTBALL_LEAGUES.france;
    const dataset = await loadFootballDataset("france");
    const ordered = orderFootballClubIds(
      dataset.clubs.map((club) => club.id),
      league.schedule.seed,
    );
    assert.equal(ordered.length, 36);
    assert.equal(new Set(ordered).size, 36);

    const seen = new Set<string>();
    for (let offset = 0; offset < 36; offset += 1) {
      const date = new Date(Date.UTC(2026, 8, 28 + offset))
        .toISOString()
        .slice(0, 10);
      const index = footballCycleIndex(date, {
        cycleStartDate: league.schedule.cycleStartDate,
        clubCount: 36,
      });
      const clubId = ordered[index]!;
      assert.equal(seen.has(clubId), false, `repeat ${clubId} on ${date}`);
      seen.add(clubId);
    }
    assert.equal(seen.size, 36);
  });

  it("cycles after day 36 back to the first club", async () => {
    const first = await getFootballGameByDate("2026-09-28", "france");
    const afterCycle = await getFootballGameByDate("2026-11-03", "france");
    assert.equal(
      footballCycleIndex("2026-11-03", {
        cycleStartDate: FOOTBALL_LEAGUES.france.schedule.cycleStartDate,
        clubCount: 36,
      }),
      0,
    );
    assert.equal(first.answerDetail?.clubId, afterCycle.answerDetail?.clubId);
  });

  it("keeps France independent from other leagues on the same date", async () => {
    const germany = await getFootballGameByDate("2026-09-28", "germany");
    const france = await getFootballGameByDate("2026-09-28", "france");
    assert.equal(france.mode, "football-france");
    assert.notEqual(france.answerDetail?.clubId, germany.answerDetail?.clubId);
  });
});

describe("Football Spain schedule", () => {
  it("resolves Spain games with football-spain mode", async () => {
    resetFootballDatasetCache("spain");
    resetFootballScheduleCache("spain");
    const game = await getFootballGameByDate("2026-09-28", "spain");
    assert.equal(game.mode, "football-spain");
    assert.equal(game.theme, "football");
    assert.ok(game.answerDetail?.stadium);
    assert.ok(game.answerDetail?.city);
  });

  it("does not repeat any club during a 42-day cycle", async () => {
    const league = FOOTBALL_LEAGUES.spain;
    const dataset = await loadFootballDataset("spain");
    const ordered = orderFootballClubIds(
      dataset.clubs.map((club) => club.id),
      league.schedule.seed,
    );
    assert.equal(ordered.length, 42);
    assert.equal(new Set(ordered).size, 42);

    const seen = new Set<string>();
    for (let offset = 0; offset < 42; offset += 1) {
      const date = new Date(Date.UTC(2026, 8, 28 + offset))
        .toISOString()
        .slice(0, 10);
      const index = footballCycleIndex(date, {
        cycleStartDate: league.schedule.cycleStartDate,
        clubCount: 42,
      });
      const clubId = ordered[index]!;
      assert.equal(seen.has(clubId), false, `repeat ${clubId} on ${date}`);
      seen.add(clubId);
    }
    assert.equal(seen.size, 42);
  });

  it("cycles after day 42 back to the first club", async () => {
    const first = await getFootballGameByDate("2026-09-28", "spain");
    const afterCycle = await getFootballGameByDate("2026-11-09", "spain");
    assert.equal(
      footballCycleIndex("2026-11-09", {
        cycleStartDate: FOOTBALL_LEAGUES.spain.schedule.cycleStartDate,
        clubCount: 42,
      }),
      0,
    );
    assert.equal(first.answerDetail?.clubId, afterCycle.answerDetail?.clubId);
  });

  it("keeps Spain independent from other leagues on the same date", async () => {
    const france = await getFootballGameByDate("2026-09-28", "france");
    const spain = await getFootballGameByDate("2026-09-28", "spain");
    assert.equal(spain.mode, "football-spain");
    assert.notEqual(spain.answerDetail?.clubId, france.answerDetail?.clubId);
  });
});
