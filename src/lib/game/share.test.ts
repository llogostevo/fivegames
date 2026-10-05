import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PLAYER_HISTORY_VERSION,
  type PlayerHistory,
  type PlayerHistoryGame,
} from "./playerHistory";
import {
  buildDailyShareText,
  buildSharePinTrail,
  buildShareText,
  buildWeeklyDayPattern,
  buildWeeklyShareText,
  countDaysPlayed,
  isWeeklyShareAvailable,
  weeklyShareBragLine,
} from "./share";
import { WEEKLY_SHARE_BRAG_SCORE_THRESHOLD } from "./shareConfig";
import { getWeeklyStats } from "./playerHistory";
import { SHARE_URL } from "@/lib/site";
import type { GameReveal, RevealedGuess } from "@/types/game";

function guess(
  partial: Partial<RevealedGuess> &
    Pick<RevealedGuess, "temperature" | "carriedForward" | "isFinalAnswer">,
): RevealedGuess {
  return {
    lat: 51.5,
    lng: -0.1,
    distanceMeters: 1000,
    score: 4000,
    ...partial,
  };
}

function reveal(overrides: Partial<GameReveal> = {}): GameReveal {
  const guesses = overrides.guesses ?? [
    guess({
      temperature: null,
      carriedForward: false,
      isFinalAnswer: false,
    }),
    guess({
      temperature: "warmer",
      carriedForward: false,
      isFinalAnswer: false,
    }),
    guess({
      temperature: "warmer",
      carriedForward: false,
      isFinalAnswer: false,
    }),
    guess({
      temperature: "warmer",
      carriedForward: false,
      isFinalAnswer: true,
    }),
    guess({
      temperature: null,
      carriedForward: true,
      isFinalAnswer: false,
      distanceMeters: null,
    }),
  ];

  return {
    gameId: "2026-10-02",
    gameNumber: 4,
    date: "2026-10-02",
    themeId: "history",
    theme: "History",
    accent: "#b45309",
    accentSoft: "#fef3c7",
    nextReleaseAt: "2026-10-03T07:00:00.000Z",
    answer: { name: "York", coordinates: { lat: 1, lng: 2 } },
    guesses,
    lockedAfterClue: 4,
    cluesUsed: 4,
    complete: true,
    finalCoordinates: { lat: 51.5, lng: -0.1 },
    actualGuessCount: 4,
    totalScore: 22_315,
    maxScore: 25_000,
    foundLocation: false,
    foundOnPin: null,
    ...overrides,
  };
}

function historyGame(
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

/** Week of Mon 2026-09-28 … Sun 2026-10-04 (PIN5 Week 1). */
const WEEK1 = [
  "2026-09-28",
  "2026-09-29",
  "2026-09-30",
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
] as const;

describe("buildSharePinTrail", () => {
  it("maps first pin, warmer steps, and final answer", () => {
    assert.equal(buildSharePinTrail(reveal().guesses), "📍 🔥 🔥 🎯");
  });

  it("uses colder and same markers for mid pins", () => {
    const trail = buildSharePinTrail([
      guess({ temperature: null, carriedForward: false, isFinalAnswer: false }),
      guess({
        temperature: "colder",
        carriedForward: false,
        isFinalAnswer: false,
      }),
      guess({ temperature: "same", carriedForward: false, isFinalAnswer: false }),
      guess({
        temperature: "warmer",
        carriedForward: false,
        isFinalAnswer: true,
      }),
    ]);
    assert.equal(trail, "📍 🧊 ➡️ 🎯");
  });

  it("ignores carried-forward slots", () => {
    assert.equal(
      buildSharePinTrail([
        guess({
          temperature: null,
          carriedForward: false,
          isFinalAnswer: true,
        }),
        guess({
          temperature: null,
          carriedForward: true,
          isFinalAnswer: false,
          distanceMeters: null,
        }),
      ]),
      "🎯",
    );
  });
});

describe("buildDailyShareText", () => {
  it("matches the beta daily share layout with distance, streak and Vercel URL", () => {
    const text = buildDailyShareText(reveal(), 4);
    assert.equal(
      text,
      [
        "PIN5 #4 — History",
        "🎯 22,315 / 25,000",
        "📍 🔥 🔥 🎯",
        "🔒 Locked on clue 4/5",
        "📍 1.0 km away",
        "🔥 4 day streak",
        "",
        "You can't beat me.",
        SHARE_URL,
      ].join("\n"),
    );
    assert.equal(buildShareText(reveal(), 4), text);
    assert.equal(SHARE_URL, "https://fivegames.vercel.app/");
  });

  it("formats short final-pin distances in metres", () => {
    const text = buildDailyShareText(
      reveal({
        guesses: [
          guess({
            temperature: null,
            carriedForward: false,
            isFinalAnswer: true,
            distanceMeters: 842,
          }),
          guess({
            temperature: null,
            carriedForward: true,
            isFinalAnswer: false,
            distanceMeters: null,
          }),
          guess({
            temperature: null,
            carriedForward: true,
            isFinalAnswer: false,
            distanceMeters: null,
          }),
          guess({
            temperature: null,
            carriedForward: true,
            isFinalAnswer: false,
            distanceMeters: null,
          }),
          guess({
            temperature: null,
            carriedForward: true,
            isFinalAnswer: false,
            distanceMeters: null,
          }),
        ],
        lockedAfterClue: 1,
        actualGuessCount: 1,
      }),
      0,
    );
    assert.match(text, /📍 842 m away/);
  });

  it("omits the streak line when streak is zero", () => {
    const text = buildDailyShareText(reveal(), 0);
    assert.ok(!text.includes("day streak"));
    assert.ok(text.includes("You can't beat me."));
  });
});

describe("weekly share availability", () => {
  it("enables weekly share only on Sunday completion", () => {
    assert.equal(isWeeklyShareAvailable("2026-10-04"), true); // Sun
    assert.equal(isWeeklyShareAvailable("2026-09-28"), false); // Mon
    assert.equal(isWeeklyShareAvailable("2026-10-01"), false); // Thu
    assert.equal(isWeeklyShareAvailable("2026-10-03"), false); // Sat
  });
});

describe("weekly share content", () => {
  it("totals seven completed days and reports 7/7 with max 175,000", () => {
    const full = history(WEEK1.map((date) => historyGame(date, 25_000)));
    const sunday = "2026-10-04";
    const weekly = getWeeklyStats(full, sunday);
    assert.equal(weekly.weeklyScore, 175_000);
    assert.equal(countDaysPlayed(weekly), 7);
    assert.equal(
      buildWeeklyDayPattern(weekly),
      "M ✓ · T ✓ · W ✓ · T ✓ · F ✓ · S ✓ · S ✓",
    );

    const text = buildWeeklyShareText({
      history: full,
      referenceDate: sunday,
      streak: 9,
    });
    assert.equal(
      text,
      [
        "PIN5 — WEEK 1",
        "🏆 175,000 / 175,000",
        "📅 7/7 played",
        "M ✓ · T ✓ · W ✓ · T ✓ · F ✓ · S ✓ · S ✓",
        "🔥 9 day streak",
        "",
        "You can't beat my week.",
        SHARE_URL,
      ].join("\n"),
    );
  });

  it("excludes missed days from score and shows 5/7 pattern", () => {
    const partial = history([
      historyGame("2026-09-28", 20_000),
      historyGame("2026-09-29", 20_000),
      // Wed missed
      historyGame("2026-10-01", 18_420),
      // Fri missed
      historyGame("2026-10-03", 18_000),
      historyGame("2026-10-04", 20_000),
    ]);
    const weekly = getWeeklyStats(partial, "2026-10-04");
    assert.equal(weekly.weeklyScore, 96_420);
    assert.equal(countDaysPlayed(weekly), 5);
    assert.equal(
      buildWeeklyDayPattern(weekly),
      "M ✓ · T ✓ · W — · T ✓ · F — · S ✓ · S ✓",
    );

    const text = buildWeeklyShareText({
      history: partial,
      referenceDate: "2026-10-04",
      streak: 0,
    });
    assert.match(text, /📅 5\/7 played/);
    assert.match(text, /🏆 96,420 \/ 175,000/);
    assert.match(text, /Can you beat my week\?/);
    assert.ok(!text.includes("day streak"));
  });

  it("uses sequential PIN5 week numbers across Sunday/Monday", () => {
    const week1 = buildWeeklyShareText({
      history: history([historyGame("2026-10-04", 10_000)]),
      referenceDate: "2026-10-04",
    });
    assert.match(week1, /PIN5 — WEEK 1/);

    const week2Sunday = buildWeeklyShareText({
      history: history([historyGame("2026-10-11", 10_000)]),
      referenceDate: "2026-10-11",
    });
    assert.match(week2Sunday, /PIN5 — WEEK 2/);
  });

  it("applies brag rules for full and incomplete weeks", () => {
    assert.equal(
      weeklyShareBragLine(WEEKLY_SHARE_BRAG_SCORE_THRESHOLD, 7),
      "You can't beat my week.",
    );
    assert.equal(
      weeklyShareBragLine(WEEKLY_SHARE_BRAG_SCORE_THRESHOLD - 1, 7),
      "Can you beat my week?",
    );
    assert.equal(
      weeklyShareBragLine(175_000, 6),
      "Can you beat my week?",
    );
  });

  it("can include a streak longer than seven days", () => {
    const text = buildWeeklyShareText({
      history: history(WEEK1.map((date) => historyGame(date, 20_000))),
      referenceDate: "2026-10-04",
      streak: 12,
    });
    assert.match(text, /🔥 12 day streak/);
  });

  it("contains no spoilers and uses the Vercel beta URL", () => {
    const text = buildWeeklyShareText({
      history: history(WEEK1.map((date) => historyGame(date, 15_000))),
      referenceDate: "2026-10-04",
      streak: 3,
    });
    assert.ok(!text.toLowerCase().includes("liverpool"));
    assert.ok(!text.toLowerCase().includes("york"));
    assert.ok(!text.includes("lat"));
    assert.ok(!text.includes("clue"));
    assert.ok(!text.includes("km"));
    assert.ok(text.endsWith(SHARE_URL));
    assert.equal(SHARE_URL, "https://fivegames.vercel.app/");
  });
});
