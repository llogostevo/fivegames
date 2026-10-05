import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  continueToNextClue,
  lockFinalAnswer,
  lockGuess,
} from "./evaluateGuess";
import { buildReveal } from "./reveal";
import { SCORING } from "./scoring";
import { createEmptySession } from "./session";
import type { GameDefinition } from "../../types/game";

const game: GameDefinition = {
  id: "2026-09-28",
  date: "2026-09-28",
  gameNumber: 1,
  theme: "music",
  answer: { name: "Liverpool", lat: 53.4084, lng: -2.9916 },
  clues: ["c1", "c2", "c3", "c4", "c5"],
};

/** Outside the 1km FOUND radius — used for normal / early-lock flows. */
const farAway = { lat: 51.5074, lng: -0.1278 };
const mid = { lat: 53.4808, lng: -2.2426 };
/** Slightly closer than farAway but still outside FOUND. */
const closerOutside = { lat: 53.2, lng: -2.5 };

describe("early lock answer", () => {
  it("locks after clue 1 and carries the pin forward", () => {
    let session = createEmptySession(game.id);
    const locked = lockGuess({ game, session, guess: mid });
    session = locked.session;

    assert.equal(locked.response.complete, false);
    assert.equal(locked.response.awaitingDecision, true);
    assert.equal(locked.response.canLockAnswer, true);
    assert.equal(locked.response.reveal, null);

    const answer = lockFinalAnswer({ game, session });
    const reveal = answer.response.reveal;

    assert.equal(answer.response.complete, true);
    assert.equal(reveal.foundLocation, false);
    assert.equal(reveal.lockedAfterClue, 1);
    assert.equal(reveal.actualGuessCount, 1);
    assert.equal(reveal.guesses.filter((g) => !g.carriedForward).length, 1);
    assert.equal(reveal.guesses.filter((g) => g.carriedForward).length, 4);
    assert.equal(reveal.guesses[0]?.isFinalAnswer, true);

    const finalScore = reveal.guesses[0]?.score ?? 0;
    assert.ok(finalScore > 0);
    assert.ok(finalScore < SCORING.MAX_POINTS_PER_GUESS);
    assert.equal(
      reveal.guesses.every(
        (row, index) => index === 0 || row.score === finalScore,
      ),
      true,
    );
    assert.equal(reveal.totalScore, finalScore * 5);
    assert.equal(reveal.maxScore, SCORING.MAX_TOTAL_POINTS);
    assert.ok(reveal.totalScore <= 25_000);
    assert.equal(reveal.gameId, game.id);
    assert.equal(reveal.gameNumber, 1);
    assert.equal(reveal.date, game.date);
    assert.equal(reveal.themeId, "music");
    assert.equal(reveal.theme, "Music");
    assert.equal(reveal.accent, "#c4157a");
    assert.ok(reveal.nextReleaseAt);
    assert.equal(reveal.cluesUsed, 1);
    assert.equal(reveal.complete, true);
  });

  it("locks after clue 2 with warmer/colder on actual guesses only", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    session = continueToNextClue({ game, session }).session;
    assert.equal(session.revealedClueCount, 2);

    const second = lockGuess({ game, session, guess: closerOutside });
    // Mid-game commit must not leak warmer/colder until Get Another Clue.
    assert.equal(second.response.temperature, null);
    assert.equal(second.response.complete, false);
    session = second.session;

    const answer = lockFinalAnswer({ game, session });
    const reveal = answer.response.reveal;

    assert.equal(reveal.foundLocation, false);
    assert.equal(reveal.lockedAfterClue, 2);
    assert.equal(reveal.actualGuessCount, 2);
    assert.equal(reveal.guesses[0]?.carriedForward, false);
    assert.equal(reveal.guesses[1]?.carriedForward, false);
    assert.equal(reveal.guesses[1]?.isFinalAnswer, true);
    assert.equal(reveal.guesses[1]?.temperature, "warmer");
    assert.equal(reveal.guesses[2]?.carriedForward, true);
    assert.equal(reveal.guesses[2]?.distanceMeters, null);
    assert.equal(reveal.guesses[2]?.temperature, null);
  });

  it("locks after clue 3 and clue 4", () => {
    for (const stopAt of [3, 4]) {
      let session = createEmptySession(game.id);
      const pins = [farAway, mid, closerOutside, mid, farAway];

      for (let i = 0; i < stopAt; i += 1) {
        session = lockGuess({ game, session, guess: pins[i] }).session;
        if (i < stopAt - 1) {
          session = continueToNextClue({ game, session }).session;
        }
      }

      const answer = lockFinalAnswer({ game, session });
      assert.equal(answer.response.reveal.foundLocation, false);
      assert.equal(answer.response.reveal.lockedAfterClue, stopAt);
      assert.equal(answer.response.reveal.actualGuessCount, stopAt);
      assert.equal(
        answer.response.reveal.guesses.filter((g) => g.carriedForward).length,
        5 - stopAt,
      );
    }
  });

  it("completes normally after clue 5 without early lock", () => {
    let session = createEmptySession(game.id);
    const pins = [farAway, mid, farAway, mid, closerOutside];

    for (let i = 0; i < 5; i += 1) {
      const result = lockGuess({ game, session, guess: pins[i] });
      session = result.session;
      if (i < 4) {
        assert.equal(result.response.awaitingDecision, true);
        session = continueToNextClue({ game, session }).session;
      } else {
        assert.equal(result.response.complete, true);
        assert.equal(result.response.awaitingDecision, false);
        assert.equal(result.response.reveal?.foundLocation, false);
        assert.equal(result.response.reveal?.lockedAfterClue, 5);
        assert.equal(result.response.reveal?.actualGuessCount, 5);
        assert.equal(
          result.response.reveal?.guesses.every((g) => !g.carriedForward),
          true,
        );
      }
    }
  });

  it("does not reveal remaining clues after early lock", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: mid }).session;
    const answer = lockFinalAnswer({ game, session });

    const payload = JSON.stringify(answer.response);
    assert.equal(payload.includes('"c2"'), false);
    assert.equal(payload.includes('"c3"'), false);
    assert.equal(payload.includes('"c4"'), false);
    assert.equal(payload.includes('"c5"'), false);
    assert.equal(session.revealedClueCount, 1);
  });

  it("continue reveals only the next clue", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    const continued = continueToNextClue({ game, session });
    assert.equal(continued.response.clueIndex, 1);
    assert.equal(continued.response.clue, "c2");
    assert.equal(continued.response.temperature, null);
    assert.equal(continued.session.revealedClueCount, 2);
  });

  it("Get Another Clue continues from an already-committed pin and reveals warmer/colder", () => {
    let session = createEmptySession(game.id);
    const locked = lockGuess({ game, session, guess: farAway });
    session = locked.session;
    assert.equal(locked.response.temperature, null);

    const continued = continueToNextClue({ game, session });
    session = continued.session;
    assert.equal(continued.response.clue, "c2");
    assert.equal(continued.response.temperature, null);
    assert.equal(session.guesses.length, 1);
    assert.equal(session.revealedClueCount, 2);

    const second = lockGuess({ game, session, guess: closerOutside });
    assert.equal(second.response.temperature, null);
    assert.equal(second.response.complete, false);
    const afterSecond = continueToNextClue({
      game,
      session: second.session,
    });
    assert.equal(afterSecond.response.temperature, "warmer");
    assert.equal(afterSecond.response.clue, "c3");
    session = afterSecond.session;
    assert.equal(session.revealedClueCount, 3);
    assert.equal(session.guesses.length, 2);
  });

  it("Lock Final Answer completes from an already-committed pin", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    session = continueToNextClue({ game, session }).session;
    session = lockGuess({ game, session, guess: closerOutside }).session;
    const answer = lockFinalAnswer({ game, session });
    assert.equal(answer.response.reveal.foundLocation, false);
    assert.equal(answer.response.reveal.lockedAfterClue, 2);
    assert.equal(answer.response.reveal.actualGuessCount, 2);
  });

  it("session guesses do not change without a commit call", () => {
    const session = createEmptySession(game.id);
    assert.equal(session.guesses.length, 0);
    assert.equal(session.revealedClueCount, 1);
  });

  it("warmer/colder is only returned via Get Another Clue (continue)", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    session = continueToNextClue({ game, session }).session;
    assert.equal(session.guesses.length, 1);

    const committed = lockGuess({ game, session, guess: closerOutside });
    assert.equal(committed.response.temperature, null);
    assert.equal(committed.session.guesses.length, 2);

    const continued = continueToNextClue({
      game,
      session: committed.session,
    });
    assert.equal(continued.response.temperature, "warmer");
  });

  it("clue 5 completes with Lock (guess only, no continue / no clue 6)", () => {
    let session = createEmptySession(game.id);
    const pins = [farAway, mid, farAway, mid, closerOutside];
    for (let i = 0; i < 4; i += 1) {
      session = lockGuess({ game, session, guess: pins[i] }).session;
      session = continueToNextClue({ game, session }).session;
    }
    const final = lockGuess({ game, session, guess: pins[4] });
    assert.equal(final.response.complete, true);
    assert.equal(final.response.reveal?.foundLocation, false);
    assert.equal(final.response.reveal?.lockedAfterClue, 5);
  });

  it("buildReveal keeps actual guesses distinguishable for the map", () => {
    const session = {
      gameId: game.id,
      guesses: [farAway, closerOutside],
      revealedClueCount: 2,
      lockedAfterClue: 2,
      startedAt: new Date("2026-09-28T12:00:00.000Z").toISOString(),
      foundLocation: false,
      foundOnPin: null,
    };

    const reveal = buildReveal(game, session);
    const actual = reveal.guesses.filter((g) => !g.carriedForward);
    assert.equal(actual.length, 2);
    assert.equal(reveal.actualGuessCount, 2);
    assert.equal(reveal.foundLocation, false);
    assert.notEqual(actual[0]?.lat, actual[1]?.lat);
  });

  it("maximum score remains 25,000 for a perfect early lock on the exact target", () => {
    const session = createEmptySession(game.id);
    // Exact target is FOUND → auto-completes with 25,000.
    const locked = lockGuess({
      game,
      session,
      guess: { lat: game.answer.lat, lng: game.answer.lng },
    });
    assert.equal(locked.response.complete, true);
    assert.equal(locked.response.reveal?.foundLocation, true);
    assert.equal(locked.response.reveal?.totalScore, 25_000);
  });
});
