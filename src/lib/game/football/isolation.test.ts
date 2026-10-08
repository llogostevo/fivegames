import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { londonWallTimeToUtc } from "@/lib/game/date";
import { checkPin, lockFinalAnswer } from "@/lib/game/evaluateGuess";
import { getTodaysGameForMode } from "@/lib/game/loadGame";
import {
  PLAYER_HISTORY_KEY_BY_MODE,
  SESSION_COOKIE_BY_MODE,
} from "@/lib/game/modes";
import {
  getCurrentStreak,
  getWeeklyStats,
  historyStorageKey,
  readPlayerHistory,
  recordCompletedReveal,
  writePlayerHistory,
} from "@/lib/game/playerHistory";
import { buildReveal } from "@/lib/game/reveal";
import {
  createEmptySession,
  encodeSession,
  sessionCookieOptions,
  sessionMode,
} from "@/lib/game/session";
import { resolveStartGame } from "@/lib/game/startGame";

function multiKeyStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    map,
  };
}

describe("Daily / Football isolation", () => {
  it("uses separate session cookies per mode", () => {
    assert.equal(SESSION_COOKIE_BY_MODE.daily, "fivegames_session");
    assert.equal(
      SESSION_COOKIE_BY_MODE.football,
      "fivegames_session_football",
    );
    assert.equal(
      SESSION_COOKIE_BY_MODE["football-italy"],
      "fivegames_session_football_italy",
    );
    assert.equal(
      SESSION_COOKIE_BY_MODE["football-germany"],
      "fivegames_session_football_germany",
    );
    assert.equal(
      SESSION_COOKIE_BY_MODE["football-france"],
      "fivegames_session_football_france",
    );
    assert.equal(
      SESSION_COOKIE_BY_MODE["football-spain"],
      "fivegames_session_football_spain",
    );
    assert.equal(SESSION_COOKIE_BY_MODE.world, "fivegames_session_world");
    assert.equal(
      SESSION_COOKIE_BY_MODE["london-pubs"],
      "fivegames_session_london_pubs",
    );
    assert.equal(
      SESSION_COOKIE_BY_MODE["london-stations"],
      "fivegames_session_london_stations",
    );
    assert.equal(
      SESSION_COOKIE_BY_MODE["uk-stations"],
      "fivegames_session_uk_stations",
    );
    assert.equal(
      SESSION_COOKIE_BY_MODE["world-airports"],
      "fivegames_session_world_airports",
    );
    assert.equal(
      SESSION_COOKIE_BY_MODE["taylor-swift"],
      "fivegames_session_taylor_swift",
    );
    assert.equal(
      SESSION_COOKIE_BY_MODE["harry-potter"],
      "fivegames_session_harry_potter",
    );
    assert.equal(
      SESSION_COOKIE_BY_MODE.marvel,
      "fivegames_session_marvel",
    );
    assert.equal(
      SESSION_COOKIE_BY_MODE["star-wars"],
      "fivegames_session_star_wars",
    );
    assert.notEqual(
      sessionCookieOptions("daily").name,
      sessionCookieOptions("world").name,
    );
    assert.notEqual(
      sessionCookieOptions("daily").name,
      sessionCookieOptions("football").name,
    );
    assert.notEqual(
      sessionCookieOptions("football").name,
      sessionCookieOptions("football-italy").name,
    );
    assert.notEqual(
      sessionCookieOptions("football-italy").name,
      sessionCookieOptions("football-germany").name,
    );
    assert.notEqual(
      sessionCookieOptions("football-germany").name,
      sessionCookieOptions("football-france").name,
    );
    assert.notEqual(
      sessionCookieOptions("football-france").name,
      sessionCookieOptions("football-spain").name,
    );
  });

  it("can start Daily and Football independently for the same date", async () => {
    const now = londonWallTimeToUtc("2026-09-28", 12, 0);
    const daily = await getTodaysGameForMode("daily", now, { now });
    const football = await getTodaysGameForMode("football", now, { now });

    assert.equal(daily.mode ?? "daily", "daily");
    assert.equal(football.mode, "football");
    assert.equal(daily.id, football.id);

    const dailyStart = resolveStartGame({
      game: daily,
      existingSession: null,
      now,
      clockOptions: { now },
    });
    const footballStart = resolveStartGame({
      game: football,
      existingSession: null,
      now,
      clockOptions: { now },
    });

    assert.equal(sessionMode(dailyStart.session), "daily");
    assert.equal(sessionMode(footballStart.session), "football");
    assert.equal(dailyStart.mintedNewSession, true);
    assert.equal(footballStart.mintedNewSession, true);
    assert.notEqual(
      encodeSession(dailyStart.session),
      encodeSession(footballStart.session),
    );
  });

  it("completing Daily does not complete Football (and vice versa)", async () => {
    const now = londonWallTimeToUtc("2026-09-28", 12, 0);
    const daily = await getTodaysGameForMode("daily", now, { now });
    const football = await getTodaysGameForMode("football", now, { now });

    const dailySession = createEmptySession(daily.id, now, "daily");
    const dailyPin = checkPin({
      game: daily,
      session: dailySession,
      guess: { lat: daily.answer.lat, lng: daily.answer.lng },
      now,
      clockOptions: { now },
    });
    assert.equal(dailyPin.response.found, true);
    assert.equal(dailyPin.session.lockedAfterClue, 1);

    const footballResume = resolveStartGame({
      game: football,
      existingSession: createEmptySession(football.id, now, "football"),
      now,
      clockOptions: { now },
    });
    assert.equal(footballResume.body.complete, false);
    assert.equal(footballResume.session.lockedAfterClue, null);

    let footballSession = footballResume.session;
    // Place a distant pin then Finish Here so Football completes separately.
    const miss = checkPin({
      game: football,
      session: footballSession,
      guess: { lat: 50, lng: -4 },
      now,
      clockOptions: { now },
    });
    footballSession = miss.session;
    const finish = lockFinalAnswer({
      game: football,
      session: footballSession,
      now,
      clockOptions: { now },
    });
    assert.equal(finish.response.complete, true);

    const dailyStillComplete = resolveStartGame({
      game: daily,
      existingSession: dailyPin.session,
      now,
      clockOptions: { now },
    });
    assert.equal(dailyStillComplete.body.complete, true);

    const footballStillComplete = resolveStartGame({
      game: football,
      existingSession: finish.session,
      now,
      clockOptions: { now },
    });
    assert.equal(footballStillComplete.body.complete, true);
  });

  it("resumes sessions independently by mode", async () => {
    const now = londonWallTimeToUtc("2026-09-28", 12, 0);
    const daily = await getTodaysGameForMode("daily", now, { now });
    const football = await getTodaysGameForMode("football", now, { now });

    let dailySession = createEmptySession(daily.id, now, "daily");
    const dailyCheck = checkPin({
      game: daily,
      session: dailySession,
      guess: { lat: 54, lng: -2 },
      now,
      clockOptions: { now },
    });
    dailySession = dailyCheck.session;

    let footballSession = createEmptySession(football.id, now, "football");
    const footballCheck = checkPin({
      game: football,
      session: footballSession,
      guess: { lat: 53, lng: -1 },
      now,
      clockOptions: { now },
    });
    footballSession = footballCheck.session;

    const dailyResume = resolveStartGame({
      game: daily,
      existingSession: dailySession,
      now,
      clockOptions: { now },
    });
    const footballResume = resolveStartGame({
      game: football,
      existingSession: footballSession,
      now,
      clockOptions: { now },
    });

    assert.equal(dailyResume.mintedNewSession, false);
    assert.equal(footballResume.mintedNewSession, false);
    assert.equal(dailyResume.body.guesses.length, 1);
    assert.equal(footballResume.body.guesses.length, 1);
    assert.notDeepEqual(
      dailyResume.body.guesses[0],
      footballResume.body.guesses[0],
    );
  });

  it("keeps history, streaks, and weekly scores independent", () => {
    assert.equal(historyStorageKey("daily"), PLAYER_HISTORY_KEY_BY_MODE.daily);
    assert.equal(
      historyStorageKey("football"),
      PLAYER_HISTORY_KEY_BY_MODE.football,
    );
    assert.equal(
      historyStorageKey("football-italy"),
      PLAYER_HISTORY_KEY_BY_MODE["football-italy"],
    );
    assert.equal(
      historyStorageKey("football-germany"),
      PLAYER_HISTORY_KEY_BY_MODE["football-germany"],
    );
    assert.equal(
      historyStorageKey("football-france"),
      PLAYER_HISTORY_KEY_BY_MODE["football-france"],
    );
    assert.equal(
      historyStorageKey("football-spain"),
      PLAYER_HISTORY_KEY_BY_MODE["football-spain"],
    );
    assert.equal(historyStorageKey("world"), PLAYER_HISTORY_KEY_BY_MODE.world);
    assert.equal(
      historyStorageKey("london-pubs"),
      PLAYER_HISTORY_KEY_BY_MODE["london-pubs"],
    );
    assert.equal(
      historyStorageKey("london-stations"),
      PLAYER_HISTORY_KEY_BY_MODE["london-stations"],
    );
    assert.equal(
      historyStorageKey("uk-stations"),
      PLAYER_HISTORY_KEY_BY_MODE["uk-stations"],
    );
    assert.equal(
      historyStorageKey("world-airports"),
      PLAYER_HISTORY_KEY_BY_MODE["world-airports"],
    );
    assert.equal(
      historyStorageKey("taylor-swift"),
      PLAYER_HISTORY_KEY_BY_MODE["taylor-swift"],
    );
    assert.equal(
      historyStorageKey("harry-potter"),
      PLAYER_HISTORY_KEY_BY_MODE["harry-potter"],
    );
    assert.equal(
      historyStorageKey("marvel"),
      PLAYER_HISTORY_KEY_BY_MODE.marvel,
    );
    assert.equal(
      historyStorageKey("star-wars"),
      PLAYER_HISTORY_KEY_BY_MODE["star-wars"],
    );
    assert.notEqual(historyStorageKey("daily"), historyStorageKey("world"));
    assert.notEqual(historyStorageKey("daily"), historyStorageKey("football"));
    assert.notEqual(
      historyStorageKey("football"),
      historyStorageKey("football-italy"),
    );
    assert.notEqual(
      historyStorageKey("football-italy"),
      historyStorageKey("football-germany"),
    );
    assert.notEqual(
      historyStorageKey("football-germany"),
      historyStorageKey("football-france"),
    );
    assert.notEqual(
      historyStorageKey("football-france"),
      historyStorageKey("football-spain"),
    );

    const storage = multiKeyStorage();
    const date = "2026-09-28";

    const dailyReveal = {
      gameId: date,
      gameNumber: 1,
      date,
      mode: "daily" as const,
      themeId: "music" as const,
      theme: "Music",
      accent: "#c4157a",
      accentSoft: "#fbe7f2",
      nextReleaseAt: "2026-09-29T07:00:00.000Z",
      answer: { name: "Place", coordinates: { lat: 1, lng: 2 } },
      guesses: [
        {
          lat: 1,
          lng: 2,
          distanceMeters: 100,
          temperature: null,
          isFinalAnswer: true,
        },
      ],
      lockedAfterClue: 1,
      cluesUsed: 1,
      complete: true as const,
      finalCoordinates: { lat: 1, lng: 2 },
      actualGuessCount: 1,
      totalScore: 20_000,
      maxScore: 25_000,
      clueMaximum: 25_000,
      accuracyFactor: 0.8,
      finalDistanceMeters: 100,
      foundLocation: true,
      foundOnPin: 1,
    };

    const footballReveal = {
      ...dailyReveal,
      mode: "football" as const,
      themeId: "football" as const,
      theme: "Football",
      accent: "#15803d",
      accentSoft: "#dcfce7",
      answer: {
        name: "Arsenal",
        coordinates: { lat: 51.55, lng: -0.1 },
        stadium: "Emirates Stadium",
        city: "London",
      },
      totalScore: 15_000,
    };

    recordCompletedReveal(dailyReveal, new Date(`${date}T12:00:00.000Z`), storage);
    recordCompletedReveal(
      footballReveal,
      new Date(`${date}T12:00:00.000Z`),
      storage,
    );

    const dailyHistory = readPlayerHistory(storage, "daily");
    const footballHistory = readPlayerHistory(storage, "football");

    assert.equal(dailyHistory.games[date]?.score, 20_000);
    assert.equal(footballHistory.games[date]?.score, 15_000);
    assert.equal(getCurrentStreak(dailyHistory, date), 1);
    assert.equal(getCurrentStreak(footballHistory, date), 1);
    assert.equal(getWeeklyStats(dailyHistory, date).weeklyScore, 20_000);
    assert.equal(getWeeklyStats(footballHistory, date).weeklyScore, 15_000);

    // Clearing football history must not wipe Daily.
    writePlayerHistory(
      { version: 1, games: {} },
      storage,
      "football",
    );
    assert.equal(readPlayerHistory(storage, "daily").games[date]?.score, 20_000);
    assert.equal(
      Object.keys(readPlayerHistory(storage, "football").games).length,
      0,
    );
  });

  it("buildReveal includes football answer detail only after completion", async () => {
    const now = londonWallTimeToUtc("2026-09-28", 12, 0);
    const football = await getTodaysGameForMode("football", now, { now });
    const session = createEmptySession(football.id, now, "football");
    const pin = checkPin({
      game: football,
      session,
      guess: { lat: football.answer.lat, lng: football.answer.lng },
      now,
      clockOptions: { now },
    });
    assert.equal(pin.response.found, true);
    if (!("reveal" in pin.response) || !pin.response.reveal) {
      assert.fail("expected reveal");
    }
    const reveal = pin.response.reveal;
    assert.equal(reveal.mode, "football");
    assert.ok(reveal.answer.stadium);
    assert.ok(reveal.answer.city);
    assert.equal(reveal.answer.name, football.answer.name);

    // Mid-game public body never includes answer detail.
    const mid = resolveStartGame({
      game: football,
      existingSession: createEmptySession(football.id, now, "football"),
      now,
      clockOptions: { now },
    });
    assert.equal(mid.body.reveal, null);
    assert.equal("answer" in mid.body, false);

    const rebuilt = buildReveal(football, pin.session, now, { now });
    assert.equal(rebuilt.answer.stadium, football.answerDetail?.stadium);
  });

  it("loads Italy as an independent football mode", async () => {
    const now = londonWallTimeToUtc("2026-09-28", 12, 0);
    const england = await getTodaysGameForMode("football", now, { now });
    const italy = await getTodaysGameForMode("football-italy", now, { now });

    assert.equal(england.mode, "football");
    assert.equal(italy.mode, "football-italy");
    assert.equal(england.id, italy.id);
    assert.notEqual(england.answerDetail?.clubId, italy.answerDetail?.clubId);

    const italyStart = resolveStartGame({
      game: italy,
      existingSession: null,
      now,
      clockOptions: { now },
    });
    assert.equal(sessionMode(italyStart.session), "football-italy");
    assert.equal(italyStart.mintedNewSession, true);
  });

  it("loads Germany as an independent football mode", async () => {
    const now = londonWallTimeToUtc("2026-09-28", 12, 0);
    const germany = await getTodaysGameForMode("football-germany", now, {
      now,
    });

    assert.equal(germany.mode, "football-germany");
    assert.ok(germany.answerDetail?.stadium);

    const germanyStart = resolveStartGame({
      game: germany,
      existingSession: null,
      now,
      clockOptions: { now },
    });
    assert.equal(sessionMode(germanyStart.session), "football-germany");
    assert.equal(germanyStart.mintedNewSession, true);
  });

  it("loads France as an independent football mode", async () => {
    const now = londonWallTimeToUtc("2026-09-28", 12, 0);
    const france = await getTodaysGameForMode("football-france", now, {
      now,
    });

    assert.equal(france.mode, "football-france");
    assert.ok(france.answerDetail?.stadium);

    const franceStart = resolveStartGame({
      game: france,
      existingSession: null,
      now,
      clockOptions: { now },
    });
    assert.equal(sessionMode(franceStart.session), "football-france");
    assert.equal(franceStart.mintedNewSession, true);
  });

  it("loads Spain as an independent football mode", async () => {
    const now = londonWallTimeToUtc("2026-09-28", 12, 0);
    const spain = await getTodaysGameForMode("football-spain", now, {
      now,
    });

    assert.equal(spain.mode, "football-spain");
    assert.ok(spain.answerDetail?.stadium);

    const spainStart = resolveStartGame({
      game: spain,
      existingSession: null,
      now,
      clockOptions: { now },
    });
    assert.equal(sessionMode(spainStart.session), "football-spain");
    assert.equal(spainStart.mintedNewSession, true);
  });
});
