import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { londonWallTimeToUtc } from "./date";
import { continueToNextClue, lockGuess } from "./evaluateGuess";
import { getGameByDate } from "./loadGame";
import { createEmptySession } from "./session";
import { loadGameForSession, SessionAccessError } from "./sessionAccess";

describe("loadGameForSession", () => {
  it("allows a legitimate session for a game released at startedAt", async () => {
    const startedAt = londonWallTimeToUtc("2026-10-01", 9, 0);
    const session = createEmptySession("2026-10-01", startedAt);
    const game = await loadGameForSession(session, { now: startedAt });
    assert.equal(game.id, "2026-10-01");
  });

  it("rejects an arbitrary future gameId even with a past startedAt claim", async () => {
    const startedAt = londonWallTimeToUtc("2026-10-01", 9, 0);
    const session = createEmptySession("2026-10-05", startedAt);
    await assert.rejects(
      () => loadGameForSession(session, { now: startedAt }),
      SessionAccessError,
    );
  });

  it("rejects a future game started before its 08:00 release", async () => {
    const tooEarly = londonWallTimeToUtc("2026-10-02", 7, 59);
    const session = createEmptySession("2026-10-02", tooEarly);
    await assert.rejects(
      () => loadGameForSession(session, { now: tooEarly }),
      SessionAccessError,
    );
  });

  it("lets a player finish yesterday's game after today's release", async () => {
    const startedAt = londonWallTimeToUtc("2026-10-01", 9, 0);
    const later = londonWallTimeToUtc("2026-10-02", 10, 0);
    const session = createEmptySession("2026-10-01", startedAt);
    const game = await loadGameForSession(session, { now: later });
    assert.equal(game.id, "2026-10-01");
  });
});

describe("progression and reveal safety", () => {
  it("cannot skip ahead to future clues out of sequence", async () => {
    const game = await getGameByDate("2026-09-28");
    const session = createEmptySession(game.id, londonWallTimeToUtc("2026-09-28", 12, 0));
    assert.throws(
      () => continueToNextClue({ game, session }),
      /Lock a guess before continuing/,
    );
  });

  it("keeps target and scores hidden mid-game and reveals on completion", async () => {
    const game = await getGameByDate("2026-09-28");
    let session = createEmptySession(
      game.id,
      londonWallTimeToUtc("2026-09-28", 12, 0),
    );

    const first = lockGuess({
      game,
      session,
      guess: { lat: 51.5, lng: -0.12 },
    });
    session = first.session;

    const mid = JSON.stringify(first.response);
    assert.equal(mid.includes(game.answer.name), false);
    assert.equal(mid.includes(String(game.answer.lat)), false);
    assert.equal(mid.includes('"score"'), false);
    assert.equal(mid.includes("distanceMeters"), false);
    assert.equal(first.response.reveal, null);

    session = continueToNextClue({ game, session }).session;
    assert.equal(session.revealedClueCount, 2);

    for (let i = 1; i < 5; i += 1) {
      const locked = lockGuess({
        game,
        session,
        guess: { lat: 53.4 + i * 0.01, lng: -2.9 },
      });
      session = locked.session;
      if (i < 4) {
        assert.equal(locked.response.reveal, null);
        session = continueToNextClue({ game, session }).session;
      } else {
        assert.equal(locked.response.complete, true);
        assert.ok(locked.response.reveal);
        assert.equal(locked.response.reveal!.answer.name, game.answer.name);
        assert.equal(
          locked.response.reveal!.answer.coordinates.lat,
          game.answer.lat,
        );
        assert.ok(typeof locked.response.reveal!.totalScore === "number");
      }
    }
  });
});
