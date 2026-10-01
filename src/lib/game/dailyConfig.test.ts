import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DAILY_GAME_CONFIG,
  formatDailyReleaseBlurb,
  formatReleaseTimeLabel,
} from "./dailyConfig";

describe("daily release copy", () => {
  it("derives the release-time blurb from configuration", () => {
    assert.equal(formatReleaseTimeLabel(DAILY_GAME_CONFIG), "8:00am");
    assert.equal(
      formatDailyReleaseBlurb(DAILY_GAME_CONFIG),
      "New game every day at 8:00am",
    );
  });

  it("updates copy when the configured release time changes", () => {
    assert.equal(
      formatDailyReleaseBlurb({
        ...DAILY_GAME_CONFIG,
        releaseHour: 9,
        releaseMinute: 30,
      }),
      "New game every day at 9:30am",
    );
  });
});
