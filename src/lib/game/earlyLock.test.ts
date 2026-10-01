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
  id: "test-001",
  theme: "Music",
  answer: { name: "Liverpool", lat: 53.4084, lng: -2.9916 },
  clues: ["c1", "c2", "c3", "c4", "c5"],
};

const nearTarget = { lat: 53.41, lng: -2.99 };
const farAway = { lat: 51.5074, lng: -0.1278 };
const mid = { lat: 53.4808, lng: -2.2426 };

describe("early lock answer", () => {
  it("locks after clue 1 and carries the pin forward", () => {
    let session = createEmptySession(game.id);
    const locked = lockGuess({ game, session, guess: nearTarget });
    session = locked.session;

    assert.equal(locked.response.complete, false);
    assert.equal(locked.response.awaitingDecision, true);
    assert.equal(locked.response.canLockAnswer, true);
    assert.equal(locked.response.reveal, null);

    const answer = lockFinalAnswer({ game, session });
    const reveal = answer.response.reveal;

    assert.equal(answer.response.complete, true);
    assert.equal(reveal.lockedAfterClue, 1);
    assert.equal(reveal.actualGuessCount, 1);
    assert.equal(reveal.guesses.filter((g) => !g.carriedForward).length, 1);
    assert.equal(reveal.guesses.filter((g) => g.carriedForward).length, 4);
    assert.equal(reveal.guesses[0]?.isFinalAnswer, true);

    const finalScore = reveal.guesses[0]?.score ?? 0;
    assert.ok(finalScore > 4900);
    assert.equal(
      reveal.guesses.every(
        (row, index) => index === 0 || row.score === finalScore,
      ),
      true,
    );
    assert.equal(reveal.totalScore, finalScore * 5);
    assert.equal(reveal.maxScore, SCORING.MAX_TOTAL_POINTS);
    assert.ok(reveal.totalScore <= 25_000);
  });

  it("locks after clue 2 with warmer/colder on actual guesses only", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    session = continueToNextClue({ game, session }).session;
    assert.equal(session.revealedClueCount, 2);

    const second = lockGuess({ game, session, guess: nearTarget });
    assert.equal(second.response.temperature, "warmer");
    session = second.session;

    const answer = lockFinalAnswer({ game, session });
    const reveal = answer.response.reveal;

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
      const pins = [farAway, mid, nearTarget, nearTarget, nearTarget];

      for (let i = 0; i < stopAt; i += 1) {
        session = lockGuess({ game, session, guess: pins[i] }).session;
        if (i < stopAt - 1) {
          session = continueToNextClue({ game, session }).session;
        }
      }

      const answer = lockFinalAnswer({ game, session });
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
    const pins = [farAway, mid, farAway, mid, nearTarget];

    for (let i = 0; i < 5; i += 1) {
      const result = lockGuess({ game, session, guess: pins[i] });
      session = result.session;
      if (i < 4) {
        assert.equal(result.response.awaitingDecision, true);
        session = continueToNextClue({ game, session }).session;
      } else {
        assert.equal(result.response.complete, true);
        assert.equal(result.response.awaitingDecision, false);
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
    session = lockGuess({ game, session, guess: nearTarget }).session;
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
    assert.equal(continued.session.revealedClueCount, 2);
  });

  it("Get Clue flow locks the current guess and advances in one step", () => {
    let session = createEmptySession(game.id);
    const locked = lockGuess({ game, session, guess: farAway });
    session = locked.session;
    assert.equal(locked.response.temperature, null);

    const continued = continueToNextClue({ game, session });
    session = continued.session;
    assert.equal(continued.response.clue, "c2");
    assert.equal(session.guesses.length, 1);
    assert.equal(session.revealedClueCount, 2);

    const second = lockGuess({ game, session, guess: nearTarget });
    assert.equal(second.response.temperature, "warmer");
    session = continueToNextClue({ game, session: second.session }).session;
    assert.equal(session.revealedClueCount, 3);
    assert.equal(session.guesses.length, 2);
  });

  it("Lock Final Answer flow locks the current guess then completes", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    session = continueToNextClue({ game, session }).session;
    // Pin is still "editable" client-side until this commit:
    session = lockGuess({ game, session, guess: nearTarget }).session;
    const answer = lockFinalAnswer({ game, session });
    assert.equal(answer.response.reveal.lockedAfterClue, 2);
    assert.equal(answer.response.reveal.actualGuessCount, 2);
  });

  it("clue 5 completes with See Result (guess only, no continue)", () => {
    let session = createEmptySession(game.id);
    const pins = [farAway, mid, farAway, mid, nearTarget];
    for (let i = 0; i < 4; i += 1) {
      session = lockGuess({ game, session, guess: pins[i] }).session;
      session = continueToNextClue({ game, session }).session;
    }
    const final = lockGuess({ game, session, guess: pins[4] });
    assert.equal(final.response.complete, true);
    assert.equal(final.response.reveal?.lockedAfterClue, 5);
  });

  it("buildReveal keeps actual guesses distinguishable for the map", () => {
    const session = {
      gameId: game.id,
      guesses: [farAway, nearTarget],
      revealedClueCount: 2,
      lockedAfterClue: 2,
    };

    const reveal = buildReveal(game, session);
    const actual = reveal.guesses.filter((g) => !g.carriedForward);
    assert.equal(actual.length, 2);
    assert.equal(reveal.actualGuessCount, 2);
    assert.notEqual(actual[0]?.lat, actual[1]?.lat);
  });

  it("maximum score remains 25,000 for a perfect early lock", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({
      game,
      session,
      guess: { lat: game.answer.lat, lng: game.answer.lng },
    }).session;
    const reveal = lockFinalAnswer({ game, session }).response.reveal;
    assert.equal(reveal.totalScore, 25_000);
  });
});
