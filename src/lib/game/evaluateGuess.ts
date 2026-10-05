import { CLUE_COUNT } from "@/lib/game/constants";
import type { ClockOptions } from "@/lib/game/date";
import { compareGuessTemperature, distanceMeters } from "@/lib/game/distance";
import { isFoundLocation } from "@/lib/game/found";
import { buildReveal } from "@/lib/game/reveal";
import type { GameSession } from "@/lib/game/session";
import type { Coordinates } from "@/types/coordinates";
import type {
  CheckPinResponse,
  ContinueResponse,
  GameDefinition,
  LockAnswerResponse,
  LockGuessResponse,
  TemperatureResult,
} from "@/types/game";

function isValidCoordinate(value: unknown): value is Coordinates {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Coordinates).lat === "number" &&
    typeof (value as Coordinates).lng === "number" &&
    Number.isFinite((value as Coordinates).lat) &&
    Number.isFinite((value as Coordinates).lng) &&
    (value as Coordinates).lat >= -90 &&
    (value as Coordinates).lat <= 90 &&
    (value as Coordinates).lng >= -180 &&
    (value as Coordinates).lng <= 180
  );
}

function assertActiveSession(game: GameDefinition, session: GameSession) {
  if (session.gameId !== game.id) {
    throw new Error("Session does not match game");
  }
  if (session.lockedAfterClue !== null) {
    throw new Error("Game is already complete");
  }
}

function assertCanAcceptCurrentPin(session: GameSession) {
  if (session.guesses.length >= CLUE_COUNT) {
    throw new Error("All guesses are already locked");
  }

  // Player must be on a clue they have been shown and have not yet guessed.
  if (session.guesses.length !== session.revealedClueCount - 1) {
    throw new Error("Finish the current clue decision before guessing again");
  }
}

function temperatureForCommittedGuess(
  sessionBeforeCommit: GameSession,
  guess: Coordinates,
  target: Coordinates,
): TemperatureResult | null {
  const previousGuess =
    sessionBeforeCommit.guesses[sessionBeforeCommit.guesses.length - 1];
  if (!previousGuess) {
    return null;
  }
  return compareGuessTemperature(previousGuess, guess, target);
}

function completeAsFound(options: {
  game: GameDefinition;
  session: GameSession;
  guess: Coordinates;
  now: Date;
  clockOptions: ClockOptions;
}): { session: GameSession; reveal: ReturnType<typeof buildReveal> } {
  const { game, session, guess, now, clockOptions } = options;
  const foundOnPin = session.guesses.length + 1;

  const nextSession: GameSession = {
    ...session,
    guesses: [...session.guesses, guess],
    lockedAfterClue: foundOnPin,
    foundLocation: true,
    foundOnPin,
  };

  return {
    session: nextSession,
    reveal: buildReveal(game, nextSession, now, clockOptions),
  };
}

/**
 * Commit a pin (press-and-hold completion) and evaluate FOUND atomically.
 *
 * FOUND → complete with 100% of current clue maximum.
 * NOT FOUND on pins 1–4 → commit, awaiting decision (no distance / W/C leak).
 * NOT FOUND on pin 5 → complete with accuracy × Clue 5 maximum.
 */
export function checkPin(options: {
  game: GameDefinition;
  session: GameSession;
  guess: unknown;
  now?: Date;
  clockOptions?: ClockOptions;
}): { session: GameSession; response: CheckPinResponse } {
  const { game, session, now = new Date(), clockOptions = {} } = options;
  assertActiveSession(game, session);
  assertCanAcceptCurrentPin(session);

  if (!isValidCoordinate(options.guess)) {
    throw new Error("Invalid guess coordinates");
  }

  // Ignore any client-supplied found flags — only lat/lng are used.
  const guess = { lat: options.guess.lat, lng: options.guess.lng };
  const target = { lat: game.answer.lat, lng: game.answer.lng };
  const meters = distanceMeters(guess, target);

  if (isFoundLocation(meters)) {
    const completed = completeAsFound({
      game,
      session,
      guess,
      now,
      clockOptions,
    });
    return {
      session: completed.session,
      response: {
        found: true,
        complete: true,
        reveal: completed.reveal,
      },
    };
  }

  const nextSession: GameSession = {
    ...session,
    guesses: [...session.guesses, guess],
    foundLocation: false,
    foundOnPin: null,
  };

  const guessIndex = nextSession.guesses.length;
  const complete = guessIndex >= CLUE_COUNT;

  if (complete) {
    nextSession.lockedAfterClue = CLUE_COUNT;
    return {
      session: nextSession,
      response: {
        found: false,
        complete: true,
        reveal: buildReveal(game, nextSession, now, clockOptions),
      },
    };
  }

  return {
    session: nextSession,
    response: {
      found: false,
      complete: false,
      awaitingDecision: true,
      guessIndex,
    },
  };
}

/**
 * Legacy / backstop commit path (also used by tests).
 * Mid-game responses never include warmer/colder — that is gated behind continue.
 */
export function lockGuess(options: {
  game: GameDefinition;
  session: GameSession;
  guess: unknown;
  now?: Date;
  clockOptions?: ClockOptions;
}): { session: GameSession; response: LockGuessResponse } {
  const { game, session, now = new Date(), clockOptions = {} } = options;
  assertActiveSession(game, session);
  assertCanAcceptCurrentPin(session);

  if (!isValidCoordinate(options.guess)) {
    throw new Error("Invalid guess coordinates");
  }

  const guess = {
    lat: options.guess.lat,
    lng: options.guess.lng,
  };

  const target = { lat: game.answer.lat, lng: game.answer.lng };
  const meters = distanceMeters(guess, target);

  // Security backstop: committing a FOUND pin always completes the game.
  if (isFoundLocation(meters)) {
    const completed = completeAsFound({
      game,
      session,
      guess,
      now,
      clockOptions,
    });
    return {
      session: completed.session,
      response: {
        guessIndex: completed.session.guesses.length,
        temperature: null,
        complete: true,
        awaitingDecision: false,
        canLockAnswer: false,
        reveal: completed.reveal,
      },
    };
  }

  const nextSession: GameSession = {
    ...session,
    guesses: [...session.guesses, guess],
    foundLocation: false,
    foundOnPin: null,
  };

  const guessIndex = nextSession.guesses.length;
  const complete = guessIndex >= CLUE_COUNT;

  if (complete) {
    nextSession.lockedAfterClue = CLUE_COUNT;
    return {
      session: nextSession,
      response: {
        guessIndex,
        // Reveal may include temperatures; the lock response itself does not leak mid-game W/C.
        temperature: temperatureForCommittedGuess(session, guess, target),
        complete: true,
        awaitingDecision: false,
        canLockAnswer: false,
        reveal: buildReveal(game, nextSession, now, clockOptions),
      },
    };
  }

  return {
    session: nextSession,
    response: {
      guessIndex,
      // Warmer/colder is only revealed via Get Another Clue (continue).
      temperature: null,
      complete: false,
      awaitingDecision: true,
      canLockAnswer: true,
      reveal: null,
    },
  };
}

export function continueToNextClue(options: {
  game: GameDefinition;
  session: GameSession;
}): { session: GameSession; response: ContinueResponse } {
  const { game, session } = options;
  assertActiveSession(game, session);

  if (session.guesses.length === 0) {
    throw new Error("Lock a guess before continuing");
  }

  if (session.guesses.length !== session.revealedClueCount) {
    throw new Error("No pending decision to continue from");
  }

  if (session.revealedClueCount >= CLUE_COUNT) {
    throw new Error("No further clues available");
  }

  const lastGuess = session.guesses[session.guesses.length - 1]!;
  const previousGuess = session.guesses[session.guesses.length - 2];
  const target = { lat: game.answer.lat, lng: game.answer.lng };
  const temperature: TemperatureResult | null = previousGuess
    ? compareGuessTemperature(previousGuess, lastGuess, target)
    : null;

  const nextClueIndex = session.revealedClueCount;
  const nextSession: GameSession = {
    ...session,
    revealedClueCount: session.revealedClueCount + 1,
  };

  return {
    session: nextSession,
    response: {
      clueIndex: nextClueIndex,
      clue: game.clues[nextClueIndex],
      temperature,
    },
  };
}

export function lockFinalAnswer(options: {
  game: GameDefinition;
  session: GameSession;
  now?: Date;
  clockOptions?: ClockOptions;
}): { session: GameSession; response: LockAnswerResponse } {
  const { game, session, now = new Date(), clockOptions = {} } = options;
  assertActiveSession(game, session);

  if (session.guesses.length === 0) {
    throw new Error("Lock a guess before locking your answer");
  }

  if (session.guesses.length !== session.revealedClueCount) {
    throw new Error("Lock your current guess before locking your answer");
  }

  if (session.guesses.length >= CLUE_COUNT) {
    throw new Error("Game is already on the final clue");
  }

  const finalGuess = session.guesses[session.guesses.length - 1]!;
  const target = { lat: game.answer.lat, lng: game.answer.lng };
  const meters = distanceMeters(finalGuess, target);
  const found = isFoundLocation(meters);

  const nextSession: GameSession = {
    ...session,
    lockedAfterClue: session.guesses.length,
    foundLocation: found,
    foundOnPin: found ? session.guesses.length : null,
  };

  return {
    session: nextSession,
    response: {
      complete: true,
      reveal: buildReveal(game, nextSession, now, clockOptions),
    },
  };
}
