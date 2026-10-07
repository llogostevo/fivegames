import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DAILY_GAME_CONFIG,
  formatDailyReleaseBlurb,
  formatReleaseTimeLabel,
} from "./dailyConfig";

describe("daily release copy", () => {
  it("derives the release-time blurb from configuration", () => {
    assert.equal(DAILY_GAME_CONFIG.releaseHour, 6);
    assert.equal(DAILY_GAME_CONFIG.releaseMinute, 0);
    assert.equal(DAILY_GAME_CONFIG.timezone, "Europe/London");
    assert.equal(formatReleaseTimeLabel(DAILY_GAME_CONFIG), "6am");
    assert.equal(
      formatDailyReleaseBlurb(DAILY_GAME_CONFIG),
      "A new Pin5 every morning at 6am.",
    );
  });

  it("updates copy when the configured release time changes", () => {
    assert.equal(
      formatDailyReleaseBlurb({
        ...DAILY_GAME_CONFIG,
        releaseHour: 9,
        releaseMinute: 30,
      }),
      "A new Pin5 every morning at 9:30am.",
    );
  });
});
