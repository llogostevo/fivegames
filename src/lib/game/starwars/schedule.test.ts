import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTodaysGameForMode } from "@/lib/game/loadGame";
import { scoringProfileForMode } from "@/lib/game/modes";
import { WORLD_SCORING_PROFILE } from "@/lib/game/scoring";

import { STAR_WARS_COUNT } from "./dataset";
import { STAR_WARS_SCHEDULE, starWarsGameNumber } from "./schedule";
import { resetStarWarsScheduleCache } from "./loadStarWarsGame";

describe("Star Wars schedule", () => {
  it("starts on the configured cycle date", async () => {
    resetStarWarsScheduleCache();
    const now = new Date(`${STAR_WARS_SCHEDULE.cycleStartDate}T12:00:00+01:00`);
    const first = await getTodaysGameForMode("star-wars", now, { now });
    assert.equal(first.mode, "star-wars");
    assert.equal(first.theme, "star-wars");
    assert.equal(first.gameNumber, 1);
    assert.ok(first.answer.name.length > 0);
    assert.equal(first.clues.length, 5);
  });

  it("advances to a different place the next day", async () => {
    resetStarWarsScheduleCache();
    const day1 = new Date(`${STAR_WARS_SCHEDULE.cycleStartDate}T12:00:00+01:00`);
    const day2 = new Date("2026-10-07T12:00:00+01:00");
    const first = await getTodaysGameForMode("star-wars", day1, { now: day1 });
    const second = await getTodaysGameForMode("star-wars", day2, { now: day2 });
    assert.notEqual(first.answer.name, second.answer.name);
    assert.equal(second.gameNumber, 2);
  });

  it("cycles after the full place pool", () => {
    // 145 days after 2026-10-06 → game number 146
    const afterCycleDate = "2027-02-28";
    assert.equal(starWarsGameNumber(afterCycleDate), STAR_WARS_COUNT + 1);
  });

  it("uses the world scoring profile", () => {
    assert.equal(scoringProfileForMode("star-wars"), WORLD_SCORING_PROFILE);
  });

  it("includes a connection label for today's game", async () => {
    resetStarWarsScheduleCache();
    const now = new Date(`${STAR_WARS_SCHEDULE.cycleStartDate}T12:00:00+01:00`);
    const first = await getTodaysGameForMode("star-wars", now, { now });
    assert.ok(first.connectionLabel);
    assert.match(
      first.connectionLabel,
      /location|place|venue|birthplace|park|studio|exhibition|premiere|publishing|story/i,
    );
  });
});
