import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTodaysGameForMode } from "@/lib/game/loadGame";
import { scoringProfileForMode } from "@/lib/game/modes";
import { CITY_SCORING_PROFILE } from "@/lib/game/scoring";

import { LONDON_STATIONS_COUNT } from "./dataset";
import { resetLondonStationsScheduleCache } from "./loadLondonStationsGame";
import {
  LONDON_STATIONS_SCHEDULE,
  londonStationsGameNumber,
} from "./schedule";

describe("London stations schedule", () => {
  it("starts on the configured cycle date", async () => {
    resetLondonStationsScheduleCache();
    const now = new Date(
      `${LONDON_STATIONS_SCHEDULE.cycleStartDate}T12:00:00+01:00`,
    );
    const first = await getTodaysGameForMode("london-stations", now, { now });
    assert.equal(first.mode, "london-stations");
    assert.equal(first.theme, "london-stations");
    assert.equal(first.gameNumber, 1);
    assert.ok(first.answer.name.length > 0);
    assert.equal(first.clues.length, 5);
  });

  it("advances to a different station the next day", async () => {
    resetLondonStationsScheduleCache();
    const day1 = new Date(
      `${LONDON_STATIONS_SCHEDULE.cycleStartDate}T12:00:00+01:00`,
    );
    const day2 = new Date("2026-09-29T12:00:00+01:00");
    const first = await getTodaysGameForMode("london-stations", day1, {
      now: day1,
    });
    const second = await getTodaysGameForMode("london-stations", day2, {
      now: day2,
    });
    assert.notEqual(first.answer.name, second.answer.name);
    assert.equal(second.gameNumber, 2);
  });

  it("cycles after the full station pool", () => {
    // 495 days after 2026-09-28
    assert.equal(londonStationsGameNumber("2028-02-05"), LONDON_STATIONS_COUNT + 1);
  });

  it("uses the city scoring profile", () => {
    assert.equal(
      scoringProfileForMode("london-stations"),
      CITY_SCORING_PROFILE,
    );
  });
});
