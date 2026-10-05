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
import {
  getFootballGameByDate,
  getReleasedFootballGameByDate,
  getTodaysFootballGame,
  resetFootballScheduleCache,
} from "./loadFootballGame";
import { loadFootballDataset, resetFootballDatasetCache } from "./dataset";

describe("Football schedule", () => {
  it("resolves the same club for the same date across calls", async () => {
    resetFootballDatasetCache();
    resetFootballScheduleCache();
    const first = await getFootballGameByDate("2026-09-28");
    const second = await getFootballGameByDate("2026-09-28");
    assert.equal(first.answer.name, second.answer.name);
    assert.equal(first.answerDetail?.clubId, second.answerDetail?.clubId);
    assert.equal(first.mode, "football");
  });

  it("advances to a different club on consecutive dates", async () => {
    const day1 = await getFootballGameByDate("2026-09-28");
    const day2 = await getFootballGameByDate("2026-09-29");
    assert.notEqual(day1.answerDetail?.clubId, day2.answerDetail?.clubId);
    assert.equal(day1.gameNumber + 1, day2.gameNumber);
  });

  it("does not repeat any club during a 92-day cycle", async () => {
    const dataset = await loadFootballDataset();
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
    const first = await getFootballGameByDate("2026-09-28");
    // 92 days later = same cycle index 0
    const afterCycle = await getFootballGameByDate("2026-12-29");
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
