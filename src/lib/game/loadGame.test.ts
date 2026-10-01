import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  continueToNextClue,
  lockFinalAnswer,
  lockGuess,
} from "./evaluateGuess";
import { londonWallTimeToUtc } from "./date";
import {
  GameNotFoundError,
  InvalidGameDataError,
  getGameByDate,
  getPublicGameMeta,
  getReleasedGameByDate,
  getTodaysGame,
  missingGamePlayerMessage,
  parseGameDefinition,
} from "./loadGame";
import { createEmptySession } from "./session";
import { WEEKDAY_THEMES, getTheme } from "./themes";

const validGame = {
  id: "2026-09-28",
  date: "2026-09-28",
  gameNumber: 1,
  theme: "music",
  answer: { name: "Liverpool", lat: 53.4084, lng: -2.9916 },
  clues: ["c1", "c2", "c3", "c4", "c5"],
};

describe("parseGameDefinition", () => {
  it("accepts a valid game object", () => {
    const game = parseGameDefinition(validGame, "2026-09-28");
    assert.equal(game.theme, "music");
    assert.equal(game.clues.length, 5);
    assert.equal(game.gameNumber, 1);
  });

  it("rejects an unrecognised theme", () => {
    assert.throws(
      () => parseGameDefinition({ ...validGame, theme: "jazz" }, "2026-09-28"),
      (error: unknown) =>
        error instanceof InvalidGameDataError &&
        error.message.includes("theme"),
    );
  });

  it("rejects the wrong number of clues", () => {
    assert.throws(
      () =>
        parseGameDefinition(
          { ...validGame, clues: ["only", "four", "clues", "here"] },
          "2026-09-28",
        ),
      InvalidGameDataError,
    );
  });

  it("rejects empty clue strings", () => {
    assert.throws(
      () =>
        parseGameDefinition(
          { ...validGame, clues: ["c1", "c2", "   ", "c4", "c5"] },
          "2026-09-28",
        ),
      InvalidGameDataError,
    );
  });

  it("rejects invalid coordinates", () => {
    assert.throws(
      () =>
        parseGameDefinition(
          {
            ...validGame,
            answer: { name: "X", lat: 100, lng: 0 },
          },
          "2026-09-28",
        ),
      InvalidGameDataError,
    );
  });

  it("rejects non-positive game numbers", () => {
    assert.throws(
      () => parseGameDefinition({ ...validGame, gameNumber: 0 }, "2026-09-28"),
      InvalidGameDataError,
    );
  });
});

describe("getGameByDate", () => {
  it("loads a valid dated game with the expected theme", async () => {
    const game = await getGameByDate("2026-10-01");
    assert.equal(game.id, "2026-10-01");
    assert.equal(game.theme, "history");
    assert.equal(game.gameNumber, 4);
    assert.equal(game.clues.length, 5);
    assert.equal(getTheme(game.theme).label, "History");
  });

  it("loads all seven development test games", async () => {
    const dates = [
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ] as const;

    for (const [index, date] of dates.entries()) {
      const game = await getGameByDate(date);
      const weekday = new Date(`${date}T12:00:00.000Z`).getUTCDay();
      assert.equal(game.theme, WEEKDAY_THEMES[weekday]);
      assert.equal(game.gameNumber, index + 1);
      assert.equal(game.clues.length, 5);
      assert.ok(game.answer.name.length > 0);
    }
  });

  it("throws GameNotFoundError for a missing date", async () => {
    await assert.rejects(
      () => getGameByDate("2099-01-01"),
      (error: unknown) =>
        error instanceof GameNotFoundError && error.date === "2099-01-01",
    );
  });
});

describe("getTodaysGame", () => {
  it("respects the development date override", async () => {
    const game = await getTodaysGame(new Date("2026-10-01T12:00:00.000Z"), {
      nodeEnv: "development",
      devDate: "2026-09-29",
      devNow: null,
    });
    assert.equal(game.id, "2026-09-29");
    assert.equal(game.theme, "movies-tv");
  });

  it("honours an explicit date override in production", async () => {
    const game = await getTodaysGame(new Date("2026-10-01T12:00:00.000Z"), {
      nodeEnv: "production",
      devDate: "2026-09-28",
      devNow: null,
    });
    assert.equal(game.id, "2026-09-28");
    assert.equal(game.theme, "music");
  });

  it("uses the real release clock in production when no override is set", async () => {
    const game = await getTodaysGame(new Date("2026-10-01T12:00:00.000Z"), {
      nodeEnv: "production",
      devDate: null,
      devNow: null,
    });
    assert.equal(game.id, "2026-10-01");
    assert.equal(game.theme, "history");
  });

  it("serves the previous day before the 08:00 London release", async () => {
    const clock = londonWallTimeToUtc("2026-10-01", 7, 59);
    const game = await getTodaysGame(clock, { now: clock });
    assert.equal(game.id, "2026-09-30");
    assert.equal(game.theme, "sport");
  });

  it("serves today's dated game from 08:00 London", async () => {
    const clock = londonWallTimeToUtc("2026-10-01", 8, 0);
    const game = await getTodaysGame(clock, { now: clock });
    assert.equal(game.id, "2026-10-01");
    assert.equal(game.theme, "history");
  });

  it("blocks unreleased future games from the public release helper", async () => {
    const clock = londonWallTimeToUtc("2026-10-01", 7, 59);
    await assert.rejects(
      () => getReleasedGameByDate("2026-10-01", clock, { now: clock }),
      GameNotFoundError,
    );
    // Raw loader still can read the file for internal/validation use.
    const raw = await getGameByDate("2026-10-01");
    assert.equal(raw.id, "2026-10-01");
  });
});

describe("public payload safety", () => {
  it("exposes only public meta before completion", async () => {
    const game = await getGameByDate("2026-09-28");
    const meta = getPublicGameMeta(game);
    const serialised = JSON.stringify(meta);
    assert.equal(serialised.includes(game.answer.name), false);
    assert.equal(serialised.includes(String(game.answer.lat)), false);
    assert.equal(serialised.includes(String(game.answer.lng)), false);
    assert.equal(serialised.includes(game.clues[1]!), false);
    assert.equal(meta.theme, "Music");
    assert.equal(meta.gameNumber, 1);
    assert.equal(meta.accent, getTheme("music").accent);
    assert.ok(meta.nextReleaseAt);
  });

  it("keeps the target hidden until completion during gameplay", async () => {
    const game = await getGameByDate("2026-09-28");
    let session = createEmptySession(game.id);
    const first = lockGuess({
      game,
      session,
      guess: { lat: 51.5, lng: -0.12 },
    });
    session = first.session;

    const midPayload = JSON.stringify(first.response);
    assert.equal(midPayload.includes("Liverpool"), false);
    assert.equal(midPayload.includes("53.4084"), false);
    assert.equal(first.response.reveal, null);

    const continued = continueToNextClue({ game, session });
    assert.equal(continued.response.clue, game.clues[1]);
    assert.equal(JSON.stringify(continued.response).includes("Liverpool"), false);

    session = lockGuess({
      game,
      session: continued.session,
      guess: { lat: 53.4, lng: -2.99 },
    }).session;
    const answer = lockFinalAnswer({ game, session });
    assert.equal(answer.response.reveal.answer.name, "Liverpool");
    assert.equal(answer.response.reveal.complete, true);
    assert.ok(answer.response.reveal.totalScore >= 0);
    assert.equal(answer.response.reveal.maxScore, 25_000);
  });
});

describe("missing game messaging", () => {
  it("uses a simple player-facing sentence", () => {
    assert.equal(
      missingGamePlayerMessage(),
      "Today's FiveGames isn't available yet.",
    );
  });
});
