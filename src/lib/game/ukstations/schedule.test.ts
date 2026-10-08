import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addCalendarDays } from "@/lib/game/date";
import { getTodaysGameForMode } from "@/lib/game/loadGame";
import { scoringProfileForMode } from "@/lib/game/modes";
import { COUNTRY_SCORING_PROFILE } from "@/lib/game/scoring";

import { UK_RAIL_READY_COUNT } from "./dataset";
import { resetUkStationsScheduleCache } from "./loadUkStationsGame";
import { UK_RAIL_SCHEDULE, ukRailGameNumber } from "./schedule";

describe("UK rail stations schedule", () => {
  it("starts on the configured cycle date", async () => {
    resetUkStationsScheduleCache();
    const now = new Date(
      `${UK_RAIL_SCHEDULE.cycleStartDate}T12:00:00+01:00`,
    );
    const first = await getTodaysGameForMode("uk-stations", now, { now });
    assert.equal(first.mode, "uk-stations");
    assert.equal(first.theme, "uk-stations");
    assert.equal(first.gameNumber, 1);
    assert.ok(first.answer.name.length > 0);
    assert.equal(first.clues.length, 5);
    assert.ok(first.answerDetail?.city);
    assert.ok(first.answerDetail?.division);
  });

  it("advances to a different station the next day", async () => {
    resetUkStationsScheduleCache();
    const day1 = new Date(
      `${UK_RAIL_SCHEDULE.cycleStartDate}T12:00:00+01:00`,
    );
    const day2 = new Date("2026-09-29T12:00:00+01:00");
    const first = await getTodaysGameForMode("uk-stations", day1, {
      now: day1,
    });
    const second = await getTodaysGameForMode("uk-stations", day2, {
      now: day2,
    });
    assert.notEqual(first.answer.name, second.answer.name);
    assert.notEqual(first.answerDetail?.clubId, second.answerDetail?.clubId);
    assert.equal(second.gameNumber, 2);
  });

  it("cycles after the ready station pool", () => {
    const afterCycle = addCalendarDays(
      UK_RAIL_SCHEDULE.cycleStartDate,
      UK_RAIL_READY_COUNT,
    );
    assert.equal(ukRailGameNumber(afterCycle), UK_RAIL_READY_COUNT + 1);
  });

  it("uses the country scoring profile", () => {
    assert.equal(scoringProfileForMode("uk-stations"), COUNTRY_SCORING_PROFILE);
  });
});
