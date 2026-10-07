import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { londonWallTimeToUtc } from "@/lib/game/date";
import { GAME_MODES } from "@/lib/game/modes";
import {
  historyStorageKey,
  PLAYER_HISTORY_VERSION,
} from "@/lib/game/playerHistory";

import { hubProgressForMode, readHubProgress } from "./hubProgress";

function memoryStorage(seed: Record<string, string> = {}) {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    map,
  };
}

function historyPayload(
  date: string,
  score: number,
  theme: string = "music",
) {
  return JSON.stringify({
    version: PLAYER_HISTORY_VERSION,
    games: {
      [date]: {
        gameId: date,
        gameNumber: 1,
        date,
        theme,
        score,
        lockedAfterClue: 2,
        completedAt: `${date}T12:00:00.000Z`,
      },
    },
  });
}

describe("readHubProgress", () => {
  it("reports empty progress when nothing is stored", () => {
    const now = londonWallTimeToUtc("2026-10-05", 12, 0);
    const snapshot = readHubProgress(memoryStorage(), { now });
    assert.equal(snapshot.availableGameDate, "2026-10-05");
    assert.equal(snapshot.totalModes, GAME_MODES.length);
    assert.equal(snapshot.playedTodayCount, 0);
    for (const row of snapshot.modes) {
      assert.equal(row.playedToday, false);
      assert.equal(row.todayScore, null);
      assert.equal(row.streak, 0);
    }
  });

  it("reads each mode independently for today's date", () => {
    const now = londonWallTimeToUtc("2026-10-05", 12, 0);
    const storage = memoryStorage({
      [historyStorageKey("daily")]: historyPayload("2026-10-05", 20_000),
      [historyStorageKey("football")]: historyPayload(
        "2026-10-05",
        15_000,
        "football",
      ),
      // Italy played yesterday only — should not count as today.
      [historyStorageKey("football-italy")]: historyPayload(
        "2026-10-04",
        18_000,
        "football",
      ),
    });

    const snapshot = readHubProgress(storage, { now });
    assert.equal(snapshot.playedTodayCount, 2);

    const daily = hubProgressForMode(snapshot, "daily")!;
    assert.equal(daily.playedToday, true);
    assert.equal(daily.todayScore, 20_000);
    assert.equal(daily.streak, 1);

    const england = hubProgressForMode(snapshot, "football")!;
    assert.equal(england.playedToday, true);
    assert.equal(england.todayScore, 15_000);

    const italy = hubProgressForMode(snapshot, "football-italy")!;
    assert.equal(italy.playedToday, false);
    assert.equal(italy.todayScore, null);
    // Yesterday completed → streak continues into today if available date not yet played.
    assert.equal(italy.streak, 1);
  });

  it("uses the London release date before 06:00", () => {
    const before = londonWallTimeToUtc("2026-10-05", 5, 59);
    const storage = memoryStorage({
      [historyStorageKey("daily")]: historyPayload("2026-10-04", 12_000),
    });
    const snapshot = readHubProgress(storage, { now: before });
    assert.equal(snapshot.availableGameDate, "2026-10-04");
    assert.equal(hubProgressForMode(snapshot, "daily")?.playedToday, true);
  });

  it("honours an explicit availableGameDate over the device clock", () => {
    const now = londonWallTimeToUtc("2026-10-05", 12, 0);
    const storage = memoryStorage({
      [historyStorageKey("daily")]: historyPayload("2026-09-29", 18_500),
    });
    const snapshot = readHubProgress(storage, {
      now,
      availableGameDate: "2026-09-29",
    });
    assert.equal(snapshot.availableGameDate, "2026-09-29");
    assert.equal(hubProgressForMode(snapshot, "daily")?.playedToday, true);
    assert.equal(hubProgressForMode(snapshot, "daily")?.todayScore, 18_500);
  });
});
