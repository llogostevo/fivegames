import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTodaysGameForMode } from "@/lib/game/loadGame";
import { scoringProfileForMode } from "@/lib/game/modes";
import { WORLD_SCORING_PROFILE } from "@/lib/game/scoring";

import { TAYLOR_SWIFT_COUNT } from "./dataset";
import {
  TAYLOR_SWIFT_SCHEDULE,
  taylorSwiftGameNumber,
} from "./schedule";
import { resetTaylorSwiftScheduleCache } from "./loadTaylorSwiftGame";

describe("Taylor Swift schedule", () => {
  it("starts on the configured cycle date", async () => {
    resetTaylorSwiftScheduleCache();
    const now = new Date(
      `${TAYLOR_SWIFT_SCHEDULE.cycleStartDate}T12:00:00+01:00`,
    );
    const first = await getTodaysGameForMode("taylor-swift", now, { now });
    assert.equal(first.mode, "taylor-swift");
    assert.equal(first.theme, "taylor-swift");
    assert.equal(first.gameNumber, 1);
    assert.ok(first.answer.name.length > 0);
    assert.equal(first.clues.length, 5);
  });

  it("advances to a different place the next day", async () => {
    resetTaylorSwiftScheduleCache();
    const day1 = new Date(
      `${TAYLOR_SWIFT_SCHEDULE.cycleStartDate}T12:00:00+01:00`,
    );
    const day2 = new Date("2026-10-07T12:00:00+01:00");
    const first = await getTodaysGameForMode("taylor-swift", day1, {
      now: day1,
    });
    const second = await getTodaysGameForMode("taylor-swift", day2, {
      now: day2,
    });
    assert.notEqual(first.answer.name, second.answer.name);
    assert.equal(second.gameNumber, 2);
  });

  it("cycles after the full place pool", () => {
    // 94 days after 2026-10-06 → game number 95
    const afterCycleDate = "2027-01-08";
    assert.equal(
      taylorSwiftGameNumber(afterCycleDate),
      TAYLOR_SWIFT_COUNT + 1,
    );
  });

  it("uses the world scoring profile", () => {
    assert.equal(
      scoringProfileForMode("taylor-swift"),
      WORLD_SCORING_PROFILE,
    );
  });
});
