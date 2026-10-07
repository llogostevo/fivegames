import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getAvailableGameDate,
  isGameDateReleased,
  londonWallTimeToUtc,
  resolveClock,
} from "./date";
import { getReleasedGameByDate, getTodaysGame } from "./loadGame";

describe("release gating security", () => {
  it("blocks tomorrow before 06:00 Europe/London (BST)", async () => {
    const clock = londonWallTimeToUtc("2026-10-01", 5, 59);
    assert.equal(getAvailableGameDate(clock, { now: clock }), "2026-09-30");
    assert.equal(isGameDateReleased("2026-10-01", clock, { now: clock }), false);
    await assert.rejects(
      () => getReleasedGameByDate("2026-10-01", clock, { now: clock }),
    );
    const game = await getTodaysGame(clock, { now: clock });
    assert.equal(game.id, "2026-09-30");
  });

  it("releases the daily game at 06:00 Europe/London (BST)", async () => {
    const clock = londonWallTimeToUtc("2026-10-01", 6, 0);
    assert.equal(getAvailableGameDate(clock, { now: clock }), "2026-10-01");
    const game = await getTodaysGame(clock, { now: clock });
    assert.equal(game.id, "2026-10-01");
  });

  it("handles GMT winter release boundary", async () => {
    // 2026-11-02 is a Monday after our beta set; use 2026-10-25 (last beta day).
    const before = londonWallTimeToUtc("2026-10-25", 5, 59);
    assert.equal(getAvailableGameDate(before, { now: before }), "2026-10-24");
    const at = londonWallTimeToUtc("2026-10-25", 6, 0);
    assert.equal(getAvailableGameDate(at, { now: at }), "2026-10-25");
  });

  it("client/device date cannot control release via resolveClock production path", () => {
    const real = new Date("2026-10-01T12:00:00.000Z");
    const resolved = resolveClock(real, {
      nodeEnv: "production",
      // Attacker-supplied override values — must be ignored.
      devDate: "2026-10-25",
      devNow: "2026-10-25T12:00",
    });
    assert.equal(resolved.toISOString(), real.toISOString());
    assert.equal(
      getAvailableGameDate(real, {
        nodeEnv: "production",
        devDate: "2026-10-25",
      }),
      "2026-10-01",
    );
  });

  it("development overrides still work locally", () => {
    assert.equal(
      getAvailableGameDate(new Date("2020-01-01T00:00:00.000Z"), {
        nodeEnv: "development",
        devDate: "2026-09-28",
        devNow: null,
      }),
      "2026-09-28",
    );
  });
});
