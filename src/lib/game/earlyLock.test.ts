import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  continueToNextClue,
  lockFinalAnswer,
  lockGuess,
} from "./evaluateGuess";
import { buildReveal } from "./reveal";
import { getClueMaxScore, SCORING } from "./scoring";
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

/** Outside the 1km FOUND radius — used for normal / early-finish flows. */
const farAway = { lat: 51.5074, lng: -0.1278 };
const mid = { lat: 53.4808, lng: -2.2426 };
/** Slightly closer than farAway but still outside FOUND. */
const closerOutside = { lat: 53.2, lng: -2.5 };

describe("Finish Here (early finish)", () => {
  it("finishes after clue 1 using only that pin against the Clue 1 ceiling", () => {
    let session = createEmptySession(game.id);
    const locked = lockGuess({ game, session, guess: mid });
    session = locked.session;

    assert.equal(locked.response.complete, false);
    assert.equal(locked.response.awaitingDecision, true);

    const answer = lockFinalAnswer({ game, session });
    const reveal = answer.response.reveal;

    assert.equal(answer.response.complete, true);
    assert.equal(reveal.foundLocation, false);
    assert.equal(reveal.lockedAfterClue, 1);
    assert.equal(reveal.actualGuessCount, 1);
    assert.equal(reveal.guesses.length, 1);
    assert.equal(reveal.guesses[0]?.isFinalAnswer, true);
    assert.equal(reveal.clueMaximum, 25_000);
    assert.ok(reveal.totalScore > 0);
    assert.ok(reveal.totalScore <= 25_000);
    assert.equal(reveal.maxScore, SCORING.MAX_TOTAL_POINTS);
    assert.equal(reveal.cluesUsed, 1);
  });

  it("finishes after clue 2 using Pin 2 only — previous pin does not add points", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    session = continueToNextClue({ game, session }).session;

    const second = lockGuess({ game, session, guess: closerOutside });
    assert.equal(second.response.temperature, null);
    session = second.session;

    const answer = lockFinalAnswer({ game, session });
    const reveal = answer.response.reveal;

    assert.equal(reveal.foundLocation, false);
    assert.equal(reveal.lockedAfterClue, 2);
    assert.equal(reveal.actualGuessCount, 2);
    assert.equal(reveal.guesses.length, 2);
    assert.equal(reveal.guesses[1]?.isFinalAnswer, true);
    assert.equal(reveal.guesses[1]?.temperature, "warmer");
    assert.equal(reveal.clueMaximum, 22_500);
    assert.ok(reveal.totalScore <= 22_500);
  });

  it("finishes after clue 3 and clue 4 against the correct ceilings", () => {
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
      assert.equal(answer.response.reveal.guesses.length, stopAt);
      assert.equal(
        answer.response.reveal.clueMaximum,
        getClueMaxScore(stopAt),
      );
      assert.ok(
        answer.response.reveal.totalScore <= getClueMaxScore(stopAt),
      );
    }
  });

  it("completes normally after clue 5 without Finish Here", () => {
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
        assert.equal(result.response.reveal?.clueMaximum, 15_000);
        assert.equal(result.response.reveal?.guesses.length, 5);
      }
    }
  });

  it("does not reveal remaining clues after early finish", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: mid }).session;
    const answer = lockFinalAnswer({ game, session });

    const payload = JSON.stringify(answer.response);
    assert.equal(payload.includes('"c2"'), false);
    assert.equal(payload.includes('"c3"'), false);
    assert.equal(session.revealedClueCount, 1);
  });

  it("Get Another Clue advances the ceiling without subtracting points", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    const continued = continueToNextClue({ game, session });
    assert.equal(continued.response.clueIndex, 1);
    assert.equal(continued.response.clue, "c2");
    assert.equal(continued.response.temperature, null);
    assert.equal(continued.session.revealedClueCount, 2);
    assert.equal(getClueMaxScore(2), 22_500);
  });

  it("warmer/colder is only returned via Get Another Clue", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    session = continueToNextClue({ game, session }).session;

    const committed = lockGuess({ game, session, guess: closerOutside });
    assert.equal(committed.response.temperature, null);

    const continued = continueToNextClue({
      game,
      session: committed.session,
    });
    assert.equal(continued.response.temperature, "warmer");
  });

  it("buildReveal keeps actual guesses for the journey without carried rows", () => {
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
    assert.equal(reveal.guesses.length, 2);
    assert.equal(reveal.actualGuessCount, 2);
    assert.equal(reveal.clueMaximum, 22_500);
    assert.equal(reveal.foundLocation, false);
  });

  it("FOUND on Clue 1 remains the perfect 25,000 game", () => {
    const session = createEmptySession(game.id);
    const locked = lockGuess({
      game,
      session,
      guess: { lat: game.answer.lat, lng: game.answer.lng },
    });
    assert.equal(locked.response.complete, true);
    assert.equal(locked.response.reveal?.foundLocation, true);
    assert.equal(locked.response.reveal?.totalScore, 25_000);
    assert.equal(locked.response.reveal?.clueMaximum, 25_000);
  });
});
