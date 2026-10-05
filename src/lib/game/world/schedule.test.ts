import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addCalendarDays, getAvailableGameDate, londonWallTimeToUtc } from "@/lib/game/date";
import { getTodaysGameForMode } from "@/lib/game/loadGame";
import { WORLD_SCORING_PROFILE } from "@/lib/game/scoring";
import { scoringProfileForMode } from "@/lib/game/modes";

import { WORLD_PLACE_COUNT, resetWorldDatasetCache } from "./dataset";
import {
  getWorldGameByDate,
  resetWorldScheduleCache,
} from "./loadWorldGame";
import { WORLD_SCHEDULE, worldGameNumber } from "./schedule";

describe("World schedule", () => {
  it("is deterministic for a given date", async () => {
    resetWorldDatasetCache();
    resetWorldScheduleCache();
    const first = await getWorldGameByDate("2026-09-28");
    const second = await getWorldGameByDate("2026-09-28");
    assert.equal(first.answer.name, second.answer.name);
    assert.equal(first.mode, "world");
    assert.equal(first.theme, "world");
    assert.equal(first.gameNumber, 1);
  });

  it("advances to a different place the next day", async () => {
    const day1 = await getWorldGameByDate("2026-09-28");
    const day2 = await getWorldGameByDate("2026-09-29");
    assert.notEqual(day1.answer.name, day2.answer.name);
    assert.equal(day2.gameNumber, 2);
  });

  it("cycles after the full place pool", async () => {
    const first = await getWorldGameByDate("2026-09-28");
    const afterCycleDate = addCalendarDays(
      WORLD_SCHEDULE.cycleStartDate,
      WORLD_PLACE_COUNT,
    );
    const afterCycle = await getWorldGameByDate(afterCycleDate);
    assert.equal(afterCycle.answer.name, first.answer.name);
    assert.equal(worldGameNumber(afterCycleDate), WORLD_PLACE_COUNT + 1);
  });

  it("loads today's world game through the mode router", async () => {
    const now = londonWallTimeToUtc("2026-10-05", 12, 0);
    const game = await getTodaysGameForMode("world", now, { now });
    assert.equal(game.mode, "world");
    assert.equal(game.date, getAvailableGameDate(now, { now }));
    assert.equal(game.clues.length, 5);
    assert.ok(game.answerDetail?.city);
  });

  it("uses the world scoring profile", () => {
    assert.equal(
      scoringProfileForMode("world"),
      WORLD_SCORING_PROFILE,
    );
  });
});
