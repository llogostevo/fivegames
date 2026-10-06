import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTodaysGameForMode } from "@/lib/game/loadGame";
import { scoringProfileForMode } from "@/lib/game/modes";
import { WORLD_SCORING_PROFILE } from "@/lib/game/scoring";

import { MARVEL_COUNT } from "./dataset";
import { MARVEL_SCHEDULE, marvelGameNumber } from "./schedule";
import { resetMarvelScheduleCache } from "./loadMarvelGame";

describe("Marvel schedule", () => {
  it("starts on the configured cycle date", async () => {
    resetMarvelScheduleCache();
    const now = new Date(`${MARVEL_SCHEDULE.cycleStartDate}T12:00:00+01:00`);
    const first = await getTodaysGameForMode("marvel", now, { now });
    assert.equal(first.mode, "marvel");
    assert.equal(first.theme, "marvel");
    assert.equal(first.gameNumber, 1);
    assert.ok(first.answer.name.length > 0);
    assert.equal(first.clues.length, 5);
  });

  it("advances to a different place the next day", async () => {
    resetMarvelScheduleCache();
    const day1 = new Date(`${MARVEL_SCHEDULE.cycleStartDate}T12:00:00+01:00`);
    const day2 = new Date("2026-10-07T12:00:00+01:00");
    const first = await getTodaysGameForMode("marvel", day1, { now: day1 });
    const second = await getTodaysGameForMode("marvel", day2, { now: day2 });
    assert.notEqual(first.answer.name, second.answer.name);
    assert.equal(second.gameNumber, 2);
  });

  it("cycles after the full place pool", () => {
    // 203 days after 2026-10-06 → game number 204
    const afterCycleDate = "2027-04-27";
    assert.equal(marvelGameNumber(afterCycleDate), MARVEL_COUNT + 1);
  });

  it("uses the world scoring profile", () => {
    assert.equal(scoringProfileForMode("marvel"), WORLD_SCORING_PROFILE);
  });

  it("includes a connection label for today's game", async () => {
    resetMarvelScheduleCache();
    const now = new Date(`${MARVEL_SCHEDULE.cycleStartDate}T12:00:00+01:00`);
    const first = await getTodaysGameForMode("marvel", now, { now });
    assert.ok(first.connectionLabel);
    assert.match(
      first.connectionLabel,
      /location|place|venue|birthplace|park|studio|exhibition|premiere|publishing|story/i,
    );
  });
});
