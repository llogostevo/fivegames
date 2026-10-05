import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatStreakLabel,
  getCurrentStreak,
  getWeeklyStats,
  historyGameFromReveal,
  MAX_WEEKLY_SCORE,
  parsePlayerHistory,
  PLAYER_HISTORY_VERSION,
  recordCompletedReveal,
  upsertCompletedGame,
  type PlayerHistory,
  type PlayerHistoryGame,
} from "./playerHistory";
import type { GameReveal } from "@/types/game";

function game(
  date: string,
  score: number,
  extras: Partial<PlayerHistoryGame> = {},
): PlayerHistoryGame {
  return {
    gameId: date,
    gameNumber: Number(date.slice(-2)),
    date,
    theme: "music",
    score,
    lockedAfterClue: 3,
    completedAt: `${date}T12:00:00.000Z`,
    ...extras,
  };
}

function history(games: PlayerHistoryGame[]): PlayerHistory {
  return {
    version: PLAYER_HISTORY_VERSION,
    games: Object.fromEntries(games.map((entry) => [entry.date, entry])),
  };
}

function memoryStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    dump: () => value,
  };
}

function fakeReveal(date: string, score: number): GameReveal {
  return {
    gameId: date,
    gameNumber: 1,
    date,
    themeId: "history",
    theme: "History",
    accent: "#b45309",
    accentSoft: "#fef3c7",
    nextReleaseAt: "2026-10-06T07:00:00.000Z",
    answer: { name: "York", coordinates: { lat: 1, lng: 2 } },
    guesses: [],
    lockedAfterClue: 2,
    cluesUsed: 2,
    complete: true,
    finalCoordinates: { lat: 1, lng: 2 },
    actualGuessCount: 2,
    totalScore: score,
    maxScore: 25_000,
    clueMaximum: 22_500,
    accuracyFactor: 0.8,
    finalDistanceMeters: 20_000,
    foundLocation: false,
    foundOnPin: null,
  };
}

describe("player history parsing", () => {
  it("returns empty history for empty/malformed input", () => {
    assert.deepEqual(parsePlayerHistory(null).games, {});
    assert.deepEqual(parsePlayerHistory("nope").games, {});
    assert.deepEqual(parsePlayerHistory({ version: 99, games: {} }).games, {});
    assert.deepEqual(
      parsePlayerHistory({ version: 1, games: "bad" }).games,
      {},
    );
  });

  it("drops invalid dates, scores, and partial records", () => {
    const parsed = parsePlayerHistory({
      version: 1,
      games: {
        "2026-10-05": game("2026-10-05", 1000),
        "not-a-date": { gameId: "x", score: 1 },
        "2026-10-06": game("2026-10-06", -1),
        "2026-10-07": game("2026-10-07", 30_000),
        "2026-10-08": {
          gameId: "2026-10-08",
          date: "2026-10-08",
          score: 100,
        },
      },
    });
    assert.deepEqual(Object.keys(parsed.games), ["2026-10-05"]);
  });

  it("writes the first completed game and then a second day", () => {
    const storage = memoryStorage();
    recordCompletedReveal(fakeReveal("2026-10-05", 10_000), new Date(), storage);
    recordCompletedReveal(fakeReveal("2026-10-06", 12_000), new Date(), storage);
    const parsed = parsePlayerHistory(JSON.parse(storage.dump()!));
    assert.equal(parsed.games["2026-10-05"]?.score, 10_000);
    assert.equal(parsed.games["2026-10-06"]?.score, 12_000);
  });

  it("writing the same game twice does not duplicate or change weekly sum", () => {
    let current = history([]);
    current = upsertCompletedGame(current, game("2026-10-05", 21_840));
    current = upsertCompletedGame(current, game("2026-10-05", 21_840));
    assert.equal(Object.keys(current.games).length, 1);
    assert.equal(getWeeklyStats(current, "2026-10-05").weeklyScore, 21_840);
  });

  it("restores today's missing local record from a server reveal", () => {
    const storage = memoryStorage();
    const reveal = fakeReveal("2026-10-05", 18_000);
    const restored = recordCompletedReveal(reveal, new Date(), storage);
    assert.equal(restored.games["2026-10-05"]?.score, 18_000);
    assert.deepEqual(
      historyGameFromReveal(reveal).score,
      restored.games["2026-10-05"]?.score,
    );
  });
});

describe("weekly score", () => {
  it("sums Monday only through a full week", () => {
    const mon = history([game("2026-10-05", 10_000)]);
    assert.equal(getWeeklyStats(mon, "2026-10-05").weeklyScore, 10_000);

    const two = upsertCompletedGame(mon, game("2026-10-06", 12_000));
    assert.equal(getWeeklyStats(two, "2026-10-06").weeklyScore, 22_000);

    const allSeven = history([
      game("2026-10-05", 25_000),
      game("2026-10-06", 25_000),
      game("2026-10-07", 25_000),
      game("2026-10-08", 25_000),
      game("2026-10-09", 25_000),
      game("2026-10-10", 25_000),
      game("2026-10-11", 25_000),
    ]);
    assert.equal(getWeeklyStats(allSeven, "2026-10-11").weeklyScore, 175_000);
    assert.equal(MAX_WEEKLY_SCORE, 175_000);
  });

  it("keeps denominator at 175,000 with missed days", () => {
    const stats = getWeeklyStats(
      history([game("2026-10-05", 10_000), game("2026-10-08", 10_000)]),
      "2026-10-08",
    );
    assert.equal(stats.weeklyScore, 20_000);
    assert.equal(stats.maxWeeklyScore, 175_000);
    assert.equal(stats.days[2]?.status, "missed"); // Wed
  });

  it("excludes previous week and future dates", () => {
    const stats = getWeeklyStats(
      history([
        game("2026-10-04", 25_000), // previous Sunday
        game("2026-10-05", 10_000),
        game("2026-10-12", 25_000), // next Monday
      ]),
      "2026-10-06",
    );
    assert.equal(stats.weeklyScore, 10_000);
    assert.equal(stats.days[6]?.status, "future"); // Sun after Tue reference
  });

  it("resets weekly total on Sunday → Monday", () => {
    const sunday = history([
      game("2026-10-05", 5_000),
      game("2026-10-11", 9_000),
    ]);
    assert.equal(getWeeklyStats(sunday, "2026-10-11").weeklyScore, 14_000);

    const monday = upsertCompletedGame(sunday, game("2026-10-12", 8_000));
    assert.equal(getWeeklyStats(monday, "2026-10-12").weeklyScore, 8_000);
  });
});

describe("streaks", () => {
  it("counts consecutive days and continues across weeks", () => {
    assert.equal(getCurrentStreak(history([game("2026-10-05", 1)]), "2026-10-05"), 1);
    assert.equal(
      getCurrentStreak(
        history([game("2026-10-05", 1), game("2026-10-06", 1)]),
        "2026-10-06",
      ),
      2,
    );
    assert.equal(
      getCurrentStreak(
        history([
          game("2026-10-05", 1),
          game("2026-10-06", 1),
          game("2026-10-07", 1),
        ]),
        "2026-10-07",
      ),
      3,
    );

    const crossWeek = history([
      game("2026-10-09", 1), // Fri
      game("2026-10-10", 1),
      game("2026-10-11", 1),
      game("2026-10-12", 1), // Mon
    ]);
    assert.equal(getCurrentStreak(crossWeek, "2026-10-12"), 4);
  });

  it("resets after a missed day", () => {
    const h = history([
      game("2026-10-05", 1),
      game("2026-10-06", 1),
      game("2026-10-08", 1), // skipped Wed
    ]);
    assert.equal(getCurrentStreak(h, "2026-10-08"), 1);
  });

  it("preserves yesterday's streak when today is not yet completed", () => {
    const h = history([
      game("2026-10-05", 1),
      game("2026-10-06", 1),
    ]);
    // Available game is Wed; not completed → streak ends Tue = 2
    assert.equal(getCurrentStreak(h, "2026-10-07"), 2);
  });

  it("does not treat an unreleased day as a miss before 08:00", () => {
    // At Mon 07:59 the available game is still Sunday.
    const h = history([game("2026-10-11", 1)]);
    assert.equal(getCurrentStreak(h, "2026-10-11"), 1);
  });

  it("can exceed seven days", () => {
    const games = Array.from({ length: 10 }, (_, index) => {
      const day = 28 + index; // Sep 28 … Oct 7
      const date =
        day <= 30
          ? `2026-09-${day}`
          : `2026-10-0${day - 30}`;
      return game(date, 1000);
    });
    assert.equal(getCurrentStreak(history(games), "2026-10-07"), 10);
  });

  it("formats streak copy with singular day", () => {
    assert.equal(formatStreakLabel(1), "1 day streak");
    assert.equal(formatStreakLabel(3), "3 day streak");
  });
});
