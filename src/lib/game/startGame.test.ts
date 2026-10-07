import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GAME_SESSION_COOKIE_MAX_AGE_SECONDS } from "./constants";
import { londonWallTimeToUtc } from "./date";
import { continueToNextClue, lockFinalAnswer, lockGuess } from "./evaluateGuess";
import { getGameByDate, getTodaysGame } from "./loadGame";
import {
  createEmptySession,
  decodeSession,
  encodeSession,
  sessionCookieOptions,
} from "./session";
import { resolveStartGame } from "./startGame";

describe("resolveStartGame", () => {
  it("creates a new session with clue 1 when none exists", async () => {
    const game = await getGameByDate("2026-09-28");
    const result = resolveStartGame({ game, existingSession: null });

    assert.equal(result.mintedNewSession, true);
    assert.equal(result.body.status, "new");
    assert.equal(result.body.complete, false);
    assert.equal(result.body.clues.length, 1);
    assert.equal(result.body.clues[0], game.clues[0]);
    assert.equal(result.body.clue, game.clues[0]);
    assert.equal(result.body.clueIndex, 0);
    assert.equal(result.body.guesses.length, 0);
    assert.equal(result.body.reveal, null);
    assert.equal(result.session.gameId, game.id);
  });

  it("resumes an in-progress session without resetting guesses or clues", async () => {
    const game = await getGameByDate("2026-09-28");
    let session = createEmptySession(game.id, londonWallTimeToUtc("2026-09-28", 12, 0));

    session = lockGuess({
      game,
      session,
      guess: { lat: 51.5, lng: -0.12 },
    }).session;
    session = continueToNextClue({ game, session }).session;
    session = lockGuess({
      game,
      session,
      guess: { lat: 53.0, lng: -2.0 },
    }).session;
    // Awaiting decision after guess 2 — before continue.
    assert.equal(session.revealedClueCount, 2);
    assert.equal(session.guesses.length, 2);

    const first = resolveStartGame({ game, existingSession: session });
    const second = resolveStartGame({ game, existingSession: first.session });

    assert.equal(first.mintedNewSession, false);
    assert.equal(second.mintedNewSession, false);
    assert.equal(first.body.status, "resumed");
    assert.equal(second.body.status, "resumed");
    assert.deepEqual(first.body.guesses, second.body.guesses);
    assert.equal(first.body.guesses.length, 2);
    assert.equal(first.body.clues.length, 2);
    assert.equal(first.body.clues[1], game.clues[1]);
    assert.equal(first.body.awaitingDecision, true);
    assert.equal(first.body.canLockAnswer, true);
    assert.equal(first.body.clueIndex, 1);
    assert.equal(first.body.complete, false);
    assert.equal(first.body.reveal, null);

    // Future clues and answer stay hidden.
    const payload = JSON.stringify(first.body);
    assert.equal(payload.includes(game.clues[2]!), false);
    assert.equal(payload.includes(game.clues[3]!), false);
    assert.equal(payload.includes(game.answer.name), false);
    assert.equal(payload.includes(String(game.answer.lat)), false);
    assert.equal(payload.includes("distanceMeters"), false);
    assert.equal(payload.includes('"score"'), false);

    // Warmer/colder stays gated until Get Another Clue — not on awaiting decision.
    assert.equal(first.body.guesses[1]?.temperature, null);
  });

  it("resumes after next clue revealed with no guess yet", async () => {
    const game = await getGameByDate("2026-09-28");
    let session = createEmptySession(game.id, londonWallTimeToUtc("2026-09-28", 12, 0));
    session = lockGuess({
      game,
      session,
      guess: { lat: 51.5, lng: -0.12 },
    }).session;
    session = continueToNextClue({ game, session }).session;

    const result = resolveStartGame({ game, existingSession: session });
    assert.equal(result.body.status, "resumed");
    assert.equal(result.body.revealedClueCount, 2);
    assert.equal(result.body.guesses.length, 1);
    assert.equal(result.body.awaitingDecision, false);
    assert.equal(result.body.clueIndex, 1);
    assert.equal(result.body.clue, game.clues[1]);
    assert.equal(result.body.clues.length, 2);
  });

  it("reveals warmer/colder on resume only after Get Another Clue", async () => {
    const game = await getGameByDate("2026-09-28");
    let session = createEmptySession(game.id, londonWallTimeToUtc("2026-09-28", 12, 0));
    session = lockGuess({
      game,
      session,
      guess: { lat: 51.5, lng: -0.12 },
    }).session;
    session = continueToNextClue({ game, session }).session;
    session = lockGuess({
      game,
      session,
      guess: { lat: 53.0, lng: -2.0 },
    }).session;
    session = continueToNextClue({ game, session }).session;

    const result = resolveStartGame({ game, existingSession: session });
    assert.equal(result.body.awaitingDecision, false);
    assert.equal(result.body.guesses.length, 2);
    assert.ok(result.body.guesses[1]?.temperature);
  });

  it("repeated /start does not mint fresh attempts", async () => {
    const game = await getGameByDate("2026-09-28");
    let session = createEmptySession(game.id, londonWallTimeToUtc("2026-09-28", 12, 0));
    session = lockGuess({
      game,
      session,
      guess: { lat: 52, lng: -1 },
    }).session;

    for (let i = 0; i < 5; i += 1) {
      const result = resolveStartGame({ game, existingSession: session });
      assert.equal(result.mintedNewSession, false);
      assert.equal(result.body.guesses.length, 1);
      assert.equal(result.session.guesses.length, 1);
      session = result.session;
    }
  });

  it("returns completed results after five-clue finish without a new attempt", async () => {
    const game = await getGameByDate("2026-09-28");
    let session = createEmptySession(game.id, londonWallTimeToUtc("2026-09-28", 12, 0));
    const pins = [
      { lat: 51.5, lng: -0.1 },
      { lat: 52.5, lng: -1.2 },
      { lat: 53.0, lng: -2.0 },
      { lat: 53.2, lng: -2.5 },
      { lat: game.answer.lat, lng: game.answer.lng },
    ];

    for (let i = 0; i < 5; i += 1) {
      const locked = lockGuess({ game, session, guess: pins[i]! });
      session = locked.session;
      if (i < 4) {
        session = continueToNextClue({ game, session }).session;
      }
    }
    assert.equal(session.lockedAfterClue, 5);

    const result = resolveStartGame({ game, existingSession: session });
    assert.equal(result.mintedNewSession, false);
    assert.equal(result.body.status, "completed");
    assert.equal(result.body.complete, true);
    assert.ok(result.body.reveal);
    assert.equal(result.body.reveal!.answer.name, game.answer.name);
    assert.equal(result.body.reveal!.actualGuessCount, 5);
    assert.ok(typeof result.body.reveal!.totalScore === "number");

    const again = resolveStartGame({ game, existingSession: result.session });
    assert.equal(again.mintedNewSession, false);
    assert.equal(again.body.status, "completed");
    assert.equal(again.body.reveal!.totalScore, result.body.reveal!.totalScore);
  });

  it("returns completed results after early Lock Final Answer", async () => {
    const game = await getGameByDate("2026-09-28");
    let session = createEmptySession(game.id, londonWallTimeToUtc("2026-09-28", 12, 0));
    // Outside FOUND radius — normal early lock, not auto-FOUND.
    session = lockGuess({
      game,
      session,
      guess: { lat: 53.48, lng: -2.24 },
    }).session;
    session = lockFinalAnswer({ game, session }).session;
    assert.equal(session.lockedAfterClue, 1);

    const result = resolveStartGame({ game, existingSession: session });
    assert.equal(result.body.status, "completed");
    assert.equal(result.body.reveal!.lockedAfterClue, 1);
    assert.equal(result.body.reveal!.actualGuessCount, 1);
    assert.equal(result.body.reveal!.foundLocation, false);
    assert.ok(result.body.reveal!.totalScore > 0);
    assert.ok(result.body.reveal!.totalScore <= 25_000);
  });

  it("returns completed FOUND results after finding the location", async () => {
    const game = await getGameByDate("2026-09-28");
    let session = createEmptySession(game.id, londonWallTimeToUtc("2026-09-28", 12, 0));
    const found = lockGuess({
      game,
      session,
      guess: { lat: game.answer.lat, lng: game.answer.lng },
    });
    session = found.session;
    assert.equal(found.response.complete, true);
    assert.equal(session.lockedAfterClue, 1);
    assert.equal(session.foundLocation, true);

    const result = resolveStartGame({ game, existingSession: session });
    assert.equal(result.body.status, "completed");
    assert.equal(result.body.reveal!.foundLocation, true);
    assert.equal(result.body.reveal!.foundOnPin, 1);
    assert.equal(result.body.reveal!.totalScore, 25_000);
  });

  it("starts a new Tuesday session when Monday cookie remains", async () => {
    const monday = await getGameByDate("2026-09-28");
    const tuesdayClock = londonWallTimeToUtc("2026-09-29", 9, 0);
    const tuesday = await getTodaysGame(tuesdayClock, { now: tuesdayClock });
    assert.equal(tuesday.id, "2026-09-29");

    let mondaySession = createEmptySession(
      monday.id,
      londonWallTimeToUtc("2026-09-28", 12, 0),
    );
    mondaySession = lockGuess({
      game: monday,
      session: mondaySession,
      guess: { lat: 53, lng: -3 },
    }).session;
    mondaySession = lockFinalAnswer({
      game: monday,
      session: mondaySession,
    }).session;

    const result = resolveStartGame({
      game: tuesday,
      existingSession: mondaySession,
      now: tuesdayClock,
      clockOptions: { now: tuesdayClock },
    });

    assert.equal(result.mintedNewSession, true);
    assert.equal(result.body.status, "new");
    assert.equal(result.session.gameId, tuesday.id);
    assert.equal(result.body.guesses.length, 0);
    assert.equal(result.body.clues[0], tuesday.clues[0]);
  });

  it("treats a tampered session as absent and starts fresh", async () => {
    const game = await getGameByDate("2026-09-28");
    const token = encodeSession(
      createEmptySession(game.id, londonWallTimeToUtc("2026-09-28", 12, 0)),
    );
    const [payload, signature] = token.split(".");
    const flipped =
      payload!.slice(0, -1) + (payload!.endsWith("A") ? "B" : "A");
    const tampered = decodeSession(`${flipped}.${signature}`);
    assert.equal(tampered, null);

    const result = resolveStartGame({ game, existingSession: tampered });
    assert.equal(result.mintedNewSession, true);
    assert.equal(result.body.status, "new");
  });

  it("keeps future games inaccessible via start of available day only", async () => {
    const before = londonWallTimeToUtc("2026-10-01", 5, 59);
    const available = await getTodaysGame(before, { now: before });
    assert.equal(available.id, "2026-09-30");

    // Even if a cookie somehow named the unreleased day, start uses today's game.
    const forged = createEmptySession(
      "2026-10-01",
      londonWallTimeToUtc("2026-09-30", 12, 0),
    );
    const result = resolveStartGame({
      game: available,
      existingSession: forged,
      now: before,
      clockOptions: { now: before },
    });
    assert.equal(result.mintedNewSession, true);
    assert.equal(result.session.gameId, "2026-09-30");
  });
});

describe("session cookie settings", () => {
  it("uses a multi-day maxAge and production secure attributes", () => {
    assert.ok(GAME_SESSION_COOKIE_MAX_AGE_SECONDS >= 60 * 60 * 24);
    const cookie = sessionCookieOptions();
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, "lax");
    assert.equal(cookie.path, "/");
    assert.equal(cookie.maxAge, GAME_SESSION_COOKIE_MAX_AGE_SECONDS);
  });
});
