import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTodaysGameForMode } from "@/lib/game/loadGame";
import { scoringProfileForMode } from "@/lib/game/modes";
import { CITY_SCORING_PROFILE } from "@/lib/game/scoring";

import { LONDON_PUBS_COUNT } from "./dataset";
import {
  LONDON_PUBS_SCHEDULE,
  londonPubsGameNumber,
} from "./schedule";
import { resetLondonPubsScheduleCache } from "./loadLondonPubsGame";

describe("London pubs schedule", () => {
  it("starts on the configured cycle date", async () => {
    resetLondonPubsScheduleCache();
    const now = new Date(`${LONDON_PUBS_SCHEDULE.cycleStartDate}T12:00:00+01:00`);
    const first = await getTodaysGameForMode("london-pubs", now, { now });
    assert.equal(first.mode, "london-pubs");
    assert.equal(first.theme, "london-pubs");
    assert.equal(first.gameNumber, 1);
    assert.ok(first.answer.name.length > 0);
    assert.equal(first.clues.length, 5);
  });

  it("advances to a different pub the next day", async () => {
    resetLondonPubsScheduleCache();
    const day1 = new Date(`${LONDON_PUBS_SCHEDULE.cycleStartDate}T12:00:00+01:00`);
    const day2 = new Date("2026-09-29T12:00:00+01:00");
    const first = await getTodaysGameForMode("london-pubs", day1, { now: day1 });
    const second = await getTodaysGameForMode("london-pubs", day2, {
      now: day2,
    });
    assert.notEqual(first.answer.name, second.answer.name);
    assert.equal(second.gameNumber, 2);
  });

  it("cycles after the full pub pool", () => {
    const afterCycleDate = "2027-01-13"; // 107 days after 2026-09-28
    assert.equal(londonPubsGameNumber(afterCycleDate), LONDON_PUBS_COUNT + 1);
  });

  it("uses the city scoring profile", () => {
    assert.equal(
      scoringProfileForMode("london-pubs"),
      CITY_SCORING_PROFILE,
    );
  });
});
