import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DAILY_GAME_CONFIG } from "./dailyConfig";
import {
  addCalendarDays,
  formatCountdown,
  getAvailableGameDate,
  getEffectiveGameDate,
  getLondonDateISO,
  getNextReleaseAt,
  isGameDateReleased,
  isValidIsoDate,
  londonWallTimeToUtc,
  parseDevNow,
  resolveClock,
} from "./date";

describe("isValidIsoDate", () => {
  it("accepts real calendar dates", () => {
    assert.equal(isValidIsoDate("2026-10-01"), true);
    assert.equal(isValidIsoDate("2026-02-28"), true);
  });

  it("rejects malformed or impossible dates", () => {
    assert.equal(isValidIsoDate("2026-13-01"), false);
    assert.equal(isValidIsoDate("2026-02-30"), false);
    assert.equal(isValidIsoDate("26-10-01"), false);
    assert.equal(isValidIsoDate("2026/10/01"), false);
  });
});

describe("getLondonDateISO", () => {
  it("returns the London civil date around a BST midnight boundary", () => {
    assert.equal(
      getLondonDateISO(new Date("2026-10-01T22:59:00.000Z")),
      "2026-10-01",
    );
    assert.equal(
      getLondonDateISO(new Date("2026-10-01T23:00:00.000Z")),
      "2026-10-02",
    );
  });

  it("returns the London civil date around a GMT midnight boundary", () => {
    assert.equal(
      getLondonDateISO(new Date("2026-11-01T23:30:00.000Z")),
      "2026-11-01",
    );
    assert.equal(
      getLondonDateISO(new Date("2026-11-02T00:30:00.000Z")),
      "2026-11-02",
    );
  });
});

describe("londonWallTimeToUtc", () => {
  it("maps BST wall times correctly", () => {
    // 08:00 BST on 1 Oct 2026 = 07:00 UTC
    assert.equal(
      londonWallTimeToUtc("2026-10-01", 8, 0).toISOString(),
      "2026-10-01T07:00:00.000Z",
    );
  });

  it("maps GMT wall times correctly", () => {
    // 08:00 GMT on 1 Nov 2026 = 08:00 UTC
    assert.equal(
      londonWallTimeToUtc("2026-11-01", 8, 0).toISOString(),
      "2026-11-01T08:00:00.000Z",
    );
  });

  it("handles the spring-forward DST transition morning", () => {
    // 2026-03-29 clocks jump 01:00 → 02:00; 08:00 BST = 07:00 UTC
    assert.equal(
      londonWallTimeToUtc("2026-03-29", 8, 0).toISOString(),
      "2026-03-29T07:00:00.000Z",
    );
  });

  it("handles the autumn clock-change weekend", () => {
    // 2026-10-25 clocks fall back; 08:00 GMT = 08:00 UTC
    assert.equal(
      londonWallTimeToUtc("2026-10-25", 8, 0).toISOString(),
      "2026-10-25T08:00:00.000Z",
    );
  });
});

describe("daily release availability", () => {
  it("does not release today's game at 07:59 London", () => {
    const clock = londonWallTimeToUtc("2026-10-01", 7, 59);
    assert.equal(getAvailableGameDate(clock, { now: clock }), "2026-09-30");
    assert.equal(isGameDateReleased("2026-10-01", clock, { now: clock }), false);
    assert.equal(isGameDateReleased("2026-09-30", clock, { now: clock }), true);
  });

  it("releases today's game at 08:00 London", () => {
    const clock = londonWallTimeToUtc("2026-10-01", 8, 0);
    assert.equal(getAvailableGameDate(clock, { now: clock }), "2026-10-01");
    assert.equal(isGameDateReleased("2026-10-01", clock, { now: clock }), true);
  });

  it("keeps today's game available at 08:01 London", () => {
    const clock = londonWallTimeToUtc("2026-10-01", 8, 1);
    assert.equal(getAvailableGameDate(clock, { now: clock }), "2026-10-01");
  });

  it("uses GMT release timing after the autumn clock change", () => {
    const before = londonWallTimeToUtc("2026-11-01", 7, 59);
    const atRelease = londonWallTimeToUtc("2026-11-01", 8, 0);
    assert.equal(getAvailableGameDate(before, { now: before }), "2026-10-31");
    assert.equal(
      getAvailableGameDate(atRelease, { now: atRelease }),
      "2026-11-01",
    );
  });

  it("changes availability when the configured release time changes", () => {
    const clock = londonWallTimeToUtc("2026-10-01", 8, 30);
    assert.equal(
      getAvailableGameDate(clock, { now: clock }, DAILY_GAME_CONFIG),
      "2026-10-01",
    );
    assert.equal(
      getAvailableGameDate(clock, { now: clock }, {
        ...DAILY_GAME_CONFIG,
        releaseHour: 9,
        releaseMinute: 30,
      }),
      "2026-09-30",
    );
  });
});

describe("getNextReleaseAt", () => {
  it("points to today's release when still before 08:00", () => {
    const clock = londonWallTimeToUtc("2026-10-01", 7, 59);
    assert.equal(
      getNextReleaseAt(clock, { now: clock }).toISOString(),
      londonWallTimeToUtc("2026-10-01", 8, 0).toISOString(),
    );
  });

  it("points to tomorrow's release after completing after 08:00", () => {
    const clock = londonWallTimeToUtc("2026-10-01", 20, 45);
    assert.equal(
      getNextReleaseAt(clock, { now: clock }).toISOString(),
      londonWallTimeToUtc("2026-10-02", 8, 0).toISOString(),
    );
  });

  it("is not simply 24 hours from the completion instant", () => {
    const clock = londonWallTimeToUtc("2026-10-01", 20, 45);
    const next = getNextReleaseAt(clock, { now: clock });
    const hours = (next.getTime() - clock.getTime()) / 3_600_000;
    assert.ok(hours > 10 && hours < 12);
  });

  it("follows a changed release configuration", () => {
    const clock = londonWallTimeToUtc("2026-10-01", 8, 10);
    const next = getNextReleaseAt(clock, { now: clock }, {
      ...DAILY_GAME_CONFIG,
      releaseHour: 9,
      releaseMinute: 30,
    });
    assert.equal(
      next.toISOString(),
      londonWallTimeToUtc("2026-10-01", 9, 30).toISOString(),
    );
  });
});

describe("development clock overrides", () => {
  it("parses London wall-clock FIVEGAMES_DEV_NOW values", () => {
    assert.equal(
      parseDevNow("2026-10-01T07:59").toISOString(),
      londonWallTimeToUtc("2026-10-01", 7, 59).toISOString(),
    );
  });

  it("uses FIVEGAMES_DEV_DATE as noon London in development", () => {
    const clock = resolveClock(new Date("2020-01-01T00:00:00.000Z"), {
      nodeEnv: "development",
      devDate: "2026-09-30",
      devNow: null,
    });
    assert.equal(getLondonDateISO(clock), "2026-09-30");
    assert.equal(getAvailableGameDate(new Date(), {
      nodeEnv: "development",
      now: clock,
    }), "2026-09-30");
  });

  it("ignores development overrides in production", () => {
    assert.equal(
      getAvailableGameDate(new Date("2026-10-01T12:00:00.000Z"), {
        nodeEnv: "production",
        devDate: "2026-09-28",
        devNow: "2026-09-28T07:59",
      }),
      "2026-10-01",
    );
  });

  it("keeps getEffectiveGameDate aligned with availability", () => {
    const clock = londonWallTimeToUtc("2026-10-01", 7, 59);
    assert.equal(
      getEffectiveGameDate(clock, { now: clock }),
      getAvailableGameDate(clock, { now: clock }),
    );
  });
});

describe("formatCountdown", () => {
  it("formats remaining time", () => {
    assert.equal(formatCountdown(11 * 3600 + 14 * 60 + 32), "11h 14m 32s");
    assert.equal(formatCountdown(0), "0h 0m 0s");
  });
});

describe("addCalendarDays", () => {
  it("crosses month boundaries", () => {
    assert.equal(addCalendarDays("2026-09-30", 1), "2026-10-01");
    assert.equal(addCalendarDays("2026-10-01", -1), "2026-09-30");
  });
});
