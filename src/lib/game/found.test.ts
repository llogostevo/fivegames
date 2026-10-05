import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkPin, continueToNextClue, lockFinalAnswer, lockGuess } from "./evaluateGuess";
import {
  FOUND_LOCATION_RADIUS_METRES,
  isFoundLocation,
} from "./found";
import { distanceMeters } from "./distance";
import { CLUE_MAX_SCORES, getClueMaxScore } from "./scoring";
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
  it("commits NOT FOUND pins without leaking distance or score", () => {
    const session = createEmptySession(game.id);
    const result = checkPin({ game, session, guess: farAway });
    assert.equal(result.response.found, false);
    assert.equal(result.response.complete, false);
    if (result.response.found || result.response.complete) {
      return;
    }
    assert.equal(result.response.awaitingDecision, true);
    assert.equal(result.session.guesses.length, 1);
    assert.equal(JSON.stringify(result.response).includes("distance"), false);
    assert.equal(JSON.stringify(result.response).includes("score"), false);
    assert.equal(JSON.stringify(result.response).includes("temperature"), false);
    assert.equal(JSON.stringify(result.response).includes("Liverpool"), false);
  });

  it("FOUND on each clue awards 100% of that clue maximum", () => {
    const expected = [...CLUE_MAX_SCORES];
    for (const foundAt of [1, 2, 3, 4, 5] as const) {
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
      assert.equal(result.response.reveal.foundOnPin, foundAt);
      assert.equal(result.response.reveal.totalScore, expected[foundAt - 1]);
      assert.equal(result.response.reveal.clueMaximum, getClueMaxScore(foundAt));
      assert.equal(result.response.reveal.accuracyFactor, 1);
      assert.equal(result.response.reveal.guesses.length, foundAt);
      assert.equal(
        result.response.reveal.guesses.every((g) => !("score" in g)),
        true,
      );
    }
  });

  it("FOUND on Clue 1 is the only 25,000 path", () => {
    const session = createEmptySession(game.id);
    const result = checkPin({ game, session, guess: inside });
    assert.equal(result.response.found, true);
    if (!result.response.found) {
      return;
    }
    assert.equal(result.response.reveal.totalScore, 25_000);
  });

  it("completes Pin 5 outside FOUND with Clue 5 accuracy scoring", () => {
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
    assert.equal(result.response.reveal.clueMaximum, 15_000);
    assert.ok(result.response.reveal.totalScore <= 15_000);
    assert.equal(result.response.reveal.guesses.length, 5);
  });

  it("ignores client-supplied foundLocation claims", () => {
    const session = createEmptySession(game.id);
    const result = checkPin({
      game,
      session,
      guess: { ...farAway, foundLocation: true, score: 25000 } as never,
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

describe("FOUND vs Finish Here", () => {
  it("Finish Here outside 1km uses accuracy × current clue max, not prior pins", () => {
    let session = createEmptySession(game.id);
    session = lockGuess({ game, session, guess: farAway }).session;
    session = continueToNextClue({ game, session }).session;
    session = lockGuess({ game, session, guess: mid }).session;

    const answer = lockFinalAnswer({ game, session });
    const reveal = answer.response.reveal;
    assert.equal(reveal.foundLocation, false);
    assert.equal(reveal.lockedAfterClue, 2);
    assert.equal(reveal.clueMaximum, 22_500);
    assert.equal(reveal.guesses.length, 2);
    assert.ok(reveal.totalScore <= 22_500);
    // Not a sum of two independent pin scores.
    assert.ok(reveal.totalScore < 45_000);
  });
});
