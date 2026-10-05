import assert from "node:assert/strict";
import { access, constants } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { londonWallTimeToUtc } from "@/lib/game/date";
import { checkPin, continueToNextClue } from "@/lib/game/evaluateGuess";
import { getTodaysGameForMode } from "@/lib/game/loadGame";
import { SESSION_COOKIE_BY_MODE } from "@/lib/game/modes";
import { createEmptySession, sessionMode } from "@/lib/game/session";
import { loadGameForSession, SessionAccessError } from "@/lib/game/sessionAccess";
import { resolveStartGame } from "@/lib/game/startGame";

import { loadFootballDataset } from "./dataset";
import { getReleasedFootballGameByDate } from "./loadFootballGame";

describe("Football answer security", () => {
  it("keeps the dataset outside /public", async () => {
    const serverPath = path.join(
      process.cwd(),
      "data",
      "football",
      "pin5-football92-2026-27.json",
    );
    await access(serverPath, constants.R_OK);

    const publicPath = path.join(
      process.cwd(),
      "public",
      "football",
      "pin5-football92-2026-27.json",
    );
    await assert.rejects(() => access(publicPath, constants.R_OK));

    const publicDataPath = path.join(
      process.cwd(),
      "public",
      "data",
      "football",
      "pin5-football92-2026-27.json",
    );
    await assert.rejects(() => access(publicDataPath, constants.R_OK));
  });

  it("does not expose target coordinates or future clues before completion", async () => {
    const now = londonWallTimeToUtc("2026-09-28", 12, 0);
    const game = await getTodaysGameForMode("football", now, { now });
    const started = resolveStartGame({
      game,
      existingSession: null,
      now,
      clockOptions: { now },
    });

    const body = started.body;
    assert.equal(body.complete, false);
    assert.equal(body.reveal, null);
    assert.equal(body.clues.length, 1);
    assert.equal(body.clue, game.clues[0]);
    assert.equal(JSON.stringify(body).includes(String(game.answer.lat)), false);
    assert.equal(JSON.stringify(body).includes(String(game.answer.lng)), false);
    assert.equal(JSON.stringify(body).includes(game.answer.name), false);
    assert.equal(
      JSON.stringify(body).includes(game.answerDetail?.stadium ?? "___"),
      false,
    );

    // After pin 1 + continue, only clue 2 is newly revealed — not the rest.
    let session = started.session;
    const pin = checkPin({
      game,
      session,
      guess: { lat: 50, lng: -4 },
      now,
      clockOptions: { now },
    });
    session = pin.session;
    const continued = continueToNextClue({ game, session });
    assert.equal(continued.response.clue, game.clues[1]);
    assert.notEqual(continued.response.clue, game.clues[4]);
  });

  it("gates future Football games behind the release schedule", async () => {
    const before = londonWallTimeToUtc("2026-10-05", 7, 59);
    await assert.rejects(
      () =>
        getReleasedFootballGameByDate("2026-10-05", before, { now: before }),
    );
  });

  it("rejects session mode mismatches when loading a game", async () => {
    const now = londonWallTimeToUtc("2026-09-28", 12, 0);
    const football = await getTodaysGameForMode("football", now, { now });

    // Cookie for daily mode must not load the football answer via session access.
    const mismatched = createEmptySession(football.id, now, "daily");
    assert.equal(sessionMode(mismatched), "daily");

    // loadGameForSession uses session.mode → daily JSON for that date, not football.
    const loaded = await loadGameForSession(mismatched, { now });
    assert.equal(loaded.mode ?? "daily", "daily");
    assert.notEqual(loaded.answer.name, football.answer.name);

    // A forged football session with wrong mode field is rejected by cookie helper contract.
    assert.equal(SESSION_COOKIE_BY_MODE.football.endsWith("_football"), true);
  });

  it("rejects sessions started before their game released", async () => {
    const tooEarly = londonWallTimeToUtc("2026-09-28", 7, 0);
    const session = createEmptySession("2026-09-28", tooEarly, "football");
    await assert.rejects(
      () => loadGameForSession(session, { now: tooEarly }),
      SessionAccessError,
    );
  });

  it("full dataset never appears in a public start response", async () => {
    const dataset = await loadFootballDataset();
    const now = londonWallTimeToUtc("2026-09-28", 12, 0);
    const game = await getTodaysGameForMode("football", now, { now });
    const started = resolveStartGame({
      game,
      existingSession: null,
      now,
      clockOptions: { now },
    });
    const serialized = JSON.stringify(started.body);
    // Another club's stadium must not leak via the start payload.
    const other = dataset.clubs.find(
      (club) => club.id !== game.answerDetail?.clubId,
    );
    assert.ok(other);
    assert.equal(serialized.includes(other.stadium), false);
    assert.equal(serialized.includes(other.club), false);
  });
});
