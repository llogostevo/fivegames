import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkPin, continueToNextClue, lockFinalAnswer, lockGuess } from "./evaluateGuess";
import {
  FOUND_LOCATION_RADIUS_METRES,
  FOUND_PIN_SCORE,
  isFoundLocation,
} from "./found";
import { distanceMeters } from "./distance";
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

const target = { lat: game.answer.lat, lng: game.answer.lng };
const farAway = { lat: 51.5074, lng: -0.1278 };
const mid = { lat: 53.4808, lng: -2.2426 };
/** Within ~200m of Liverpool — FOUND. */
const inside = { lat: 53.41, lng: -2.99 };

describe("FOUND threshold helper", () => {
  it("treats distances at or below the radius as FOUND", () => {
    assert.equal(FOUND_LOCATION_RADIUS_METRES, 1_000);
    assert.equal(FOUND_PIN_SCORE, 5_000);
    assert.equal(isFoundLocation(999), true);
    assert.equal(isFoundLocation(1_000), true);
    assert.equal(isFoundLocation(1_001), false);
    assert.equal(isFoundLocation(0), true);
  });

  it("uses metres from the same geodesic helper as scoring", () => {
    const meters = distanceMeters(inside, target);
    assert.ok(meters < FOUND_LOCATION_RADIUS_METRES);
    assert.equal(isFoundLocation(meters), true);

    const farMeters = distanceMeters(farAway, target);
    assert.ok(farMeters > FOUND_LOCATION_RADIUS_METRES);
    assert.equal(isFoundLocation(farMeters), false);
  });
});

describe("checkPin FOUND / NOT FOUND", () => {
  it("commits NOT FOUND pins without leaking distance or warmer/colder", () => {
    const session = createEmptySession(game.id);
    const result = checkPin({ game, session, guess: farAway });
    assert.equal(result.response.found, false);
    assert.equal(result.response.complete, false);
    if (result.response.found || result.response.complete) {
      return;
    }
    assert.equal(result.response.awaitingDecision, true);
    assert.equal(result.response.guessIndex, 1);
    assert.equal(result.session.guesses.length, 1);
    assert.equal(JSON.stringify(result.response).includes("distance"), false);
    assert.equal(JSON.stringify(result.response).includes("score"), false);
    assert.equal(JSON.stringify(result.response).includes("temperature"), false);
    assert.equal(JSON.stringify(result.response).includes("Liverpool"), false);
  });

  it("completes normally when pin 5 is outside the FOUND radius", () => {
    let session = createEmptySession(game.id);
    const pins = [farAway, mid, farAway, mid, farAway];
    for (let i = 0; i < 4; i += 1) {
      session = checkPin({ game, session, guess: pins[i] }).session;
      session = continueToNextClue({ game, session }).session;
    }
    const result = checkPin({ game, session, guess: pins[4] });
    assert.equal(result.response.found, false);
    assert.equal(result.response.complete, true);
    if (!result.response.complete || result.response.found) {
      return;
    }
    assert.equal(result.response.reveal.foundLocation, false);
    assert.equal(result.response.reveal.lockedAfterClue, 5);
  });

  it("atomically completes when FOUND on pin 1 with 25,000", () => {
    const session = createEmptySession(game.id);
    const result = checkPin({ game, session, guess: inside });
    assert.equal(result.response.found, true);
    if (!result.response.found) {
      return;
    }
    assert.equal(result.response.complete, true);
    assert.equal(result.session.lockedAfterClue, 1);
    assert.equal(result.session.foundLocation, true);
    assert.equal(result.session.foundOnPin, 1);
    assert.equal(result.response.reveal.foundLocation, true);
    assert.equal(result.response.reveal.foundOnPin, 1);
    assert.equal(result.response.reveal.totalScore, 25_000);
    assert.equal(
      result.response.reveal.guesses.every((g) => g.score === FOUND_PIN_SCORE),
      true,
    );
    assert.equal(result.response.reveal.answer.name, "Liverpool");
  });

  it("FOUND on pin 2 carries 5,000 through remaining pins", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    session = continueToNextClue({ game, session }).session;

    const result = checkPin({ game, session, guess: inside });
    assert.equal(result.response.found, true);
    if (!result.response.found) {
      return;
    }

    const reveal = result.response.reveal;
    assert.equal(reveal.foundOnPin, 2);
    assert.equal(reveal.guesses[1]?.score, 5_000);
    assert.equal(reveal.guesses[2]?.score, 5_000);
    assert.equal(reveal.guesses[3]?.score, 5_000);
    assert.equal(reveal.guesses[4]?.score, 5_000);
    assert.equal(reveal.guesses[2]?.carriedForward, true);
    assert.equal(
      reveal.totalScore,
      (reveal.guesses[0]?.score ?? 0) + 20_000,
    );
    assert.ok(reveal.totalScore <= SCORING.MAX_TOTAL_POINTS);
  });

  it("FOUND on pin 3 / 4 / 5 awards the correct carried totals", () => {
    for (const foundAt of [3, 4, 5] as const) {
      let session = createEmptySession(game.id);
      const pins = [farAway, mid, farAway, mid, inside];
      for (let i = 0; i < foundAt - 1; i += 1) {
        session = lockGuess({ game, session, guess: pins[i] }).session;
        session = continueToNextClue({ game, session }).session;
      }

      const result = checkPin({ game, session, guess: inside });
      assert.equal(result.response.found, true);
      if (!result.response.found) {
        return;
      }
      const reveal = result.response.reveal;
      assert.equal(reveal.foundOnPin, foundAt);
      assert.equal(reveal.guesses[foundAt - 1]?.score, 5_000);
      const carried = 5 - foundAt;
      assert.equal(
        reveal.guesses.filter((g) => g.carriedForward).length,
        carried,
      );
      assert.equal(
        reveal.guesses
          .slice(foundAt - 1)
          .every((g) => g.score === FOUND_PIN_SCORE),
        true,
      );
      assert.ok(reveal.totalScore <= 25_000);
    }
  });

  it("ignores client-supplied foundLocation claims", () => {
    const session = createEmptySession(game.id);
    const result = checkPin({
      game,
      session,
      guess: { ...farAway, foundLocation: true, score: 5000 } as never,
    });
    assert.equal(result.response.found, false);
    assert.equal(result.session.guesses.length, 1);
    assert.equal(result.session.foundLocation, false);
  });

  it("rejects a second commit for the same clue", () => {
    let session = createEmptySession(game.id);
    session = checkPin({ game, session, guess: farAway }).session;
    assert.throws(
      () => checkPin({ game, session, guess: mid }),
      /Finish the current clue decision/,
    );
  });
});

describe("FOUND vs manual lock", () => {
  it("manual lock outside 1km does not receive automatic 5,000 FOUND scoring", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    const answer = lockFinalAnswer({ game, session });
    assert.equal(answer.response.reveal.foundLocation, false);
    assert.equal(answer.response.reveal.foundOnPin, null);
    assert.ok(answer.response.reveal.guesses[0]!.score < FOUND_PIN_SCORE);
  });

  it("lockGuess backstop completes FOUND pins without awaiting decision", () => {
    const session = createEmptySession(game.id);
    const result = lockGuess({ game, session, guess: inside });
    assert.equal(result.response.complete, true);
    assert.equal(result.response.awaitingDecision, false);
    assert.equal(result.response.reveal?.foundLocation, true);
    assert.equal(result.response.reveal?.totalScore, 25_000);
  });
});
