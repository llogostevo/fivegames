import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTodaysGameForMode } from "@/lib/game/loadGame";
import { scoringProfileForMode } from "@/lib/game/modes";
import { WORLD_SCORING_PROFILE } from "@/lib/game/scoring";

import { HARRY_POTTER_COUNT } from "./dataset";
import {
  HARRY_POTTER_SCHEDULE,
  harryPotterGameNumber,
} from "./schedule";
import { resetHarryPotterScheduleCache } from "./loadHarryPotterGame";

describe("Harry Potter schedule", () => {
  it("starts on the configured cycle date", async () => {
    resetHarryPotterScheduleCache();
    const now = new Date(
      `${HARRY_POTTER_SCHEDULE.cycleStartDate}T12:00:00+01:00`,
    );
    const first = await getTodaysGameForMode("harry-potter", now, { now });
    assert.equal(first.mode, "harry-potter");
    assert.equal(first.theme, "harry-potter");
    assert.equal(first.gameNumber, 1);
    assert.ok(first.answer.name.length > 0);
    assert.equal(first.clues.length, 5);
  });

  it("advances to a different place the next day", async () => {
    resetHarryPotterScheduleCache();
    const day1 = new Date(
      `${HARRY_POTTER_SCHEDULE.cycleStartDate}T12:00:00+01:00`,
    );
    const day2 = new Date("2026-10-07T12:00:00+01:00");
    const first = await getTodaysGameForMode("harry-potter", day1, {
      now: day1,
    });
    const second = await getTodaysGameForMode("harry-potter", day2, {
      now: day2,
    });
    assert.notEqual(first.answer.name, second.answer.name);
    assert.equal(second.gameNumber, 2);
  });

  it("cycles after the full place pool", () => {
    // 241 days after 2026-10-06 → game number 242
    const afterCycleDate = "2027-06-04";
    assert.equal(
      harryPotterGameNumber(afterCycleDate),
      HARRY_POTTER_COUNT + 1,
    );
  });

  it("uses the world scoring profile", () => {
    assert.equal(
      scoringProfileForMode("harry-potter"),
      WORLD_SCORING_PROFILE,
    );
  });

  it("includes a connection label for today's game", async () => {
    resetHarryPotterScheduleCache();
    const now = new Date(
      `${HARRY_POTTER_SCHEDULE.cycleStartDate}T12:00:00+01:00`,
    );
    const first = await getTodaysGameForMode("harry-potter", now, { now });
    assert.ok(first.connectionLabel);
    assert.match(first.connectionLabel, /location|place|venue|birthplace|park|studio|exhibition|premiere/i);
  });
});
