import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTodaysGameForMode } from "@/lib/game/loadGame";
import { scoringProfileForMode } from "@/lib/game/modes";
import { WORLD_SCORING_PROFILE } from "@/lib/game/scoring";

import { WORLD_AIRPORTS_COUNT } from "./dataset";
import { resetWorldAirportsScheduleCache } from "./loadWorldAirportsGame";
import {
  WORLD_AIRPORTS_SCHEDULE,
  worldAirportsGameNumber,
} from "./schedule";

describe("World airports schedule", () => {
  it("starts on the configured cycle date", async () => {
    resetWorldAirportsScheduleCache();
    const now = new Date(
      `${WORLD_AIRPORTS_SCHEDULE.cycleStartDate}T12:00:00+01:00`,
    );
    const first = await getTodaysGameForMode("world-airports", now, { now });
    assert.equal(first.mode, "world-airports");
    assert.equal(first.theme, "world-airports");
    assert.equal(first.gameNumber, 1);
    assert.ok(first.answer.name.length > 0);
    assert.equal(first.clues.length, 5);
  });

  it("advances to a different airport the next day", async () => {
    resetWorldAirportsScheduleCache();
    const day1 = new Date(
      `${WORLD_AIRPORTS_SCHEDULE.cycleStartDate}T12:00:00+01:00`,
    );
    const day2 = new Date("2026-09-29T12:00:00+01:00");
    const first = await getTodaysGameForMode("world-airports", day1, {
      now: day1,
    });
    const second = await getTodaysGameForMode("world-airports", day2, {
      now: day2,
    });
    assert.notEqual(first.answer.name, second.answer.name);
    assert.equal(second.gameNumber, 2);
  });

  it("cycles after the full airport pool", () => {
    // 890 days after 2026-09-28 ≈ 2029-03-06
    assert.equal(
      worldAirportsGameNumber("2029-03-06"),
      WORLD_AIRPORTS_COUNT + 1,
    );
  });

  it("uses the world scoring profile", () => {
    assert.equal(
      scoringProfileForMode("world-airports"),
      WORLD_SCORING_PROFILE,
    );
  });
});
