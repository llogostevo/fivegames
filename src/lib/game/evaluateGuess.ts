import { CLUE_COUNT } from "@/lib/game/constants";
import type { ClockOptions } from "@/lib/game/date";
import { compareGuessTemperature } from "@/lib/game/distance";
import { buildReveal } from "@/lib/game/reveal";
import type { GameSession } from "@/lib/game/session";
import type { Coordinates } from "@/types/coordinates";
import type {
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

export function lockGuess(options: {
  game: GameDefinition;
  session: GameSession;
  guess: unknown;
  now?: Date;
  clockOptions?: ClockOptions;
}): { session: GameSession; response: LockGuessResponse } {
  const { game, session, now = new Date(), clockOptions = {} } = options;
  assertActiveSession(game, session);

  if (session.guesses.length >= CLUE_COUNT) {
    throw new Error("All guesses are already locked");
  }

  // Player must be on a clue they have been shown and have not yet guessed.
  if (session.guesses.length !== session.revealedClueCount - 1) {
    throw new Error("Finish the current clue decision before guessing again");
  }

  if (!isValidCoordinate(options.guess)) {
    throw new Error("Invalid guess coordinates");
  }

  const guess = {
    lat: options.guess.lat,
    lng: options.guess.lng,
  };

  const target = { lat: game.answer.lat, lng: game.answer.lng };
  const previousGuess = session.guesses[session.guesses.length - 1];

  let temperature: TemperatureResult | null = null;
  if (previousGuess) {
    temperature = compareGuessTemperature(previousGuess, guess, target);
  }

  const nextSession: GameSession = {
    ...session,
    guesses: [...session.guesses, guess],
  };

  const guessIndex = nextSession.guesses.length;
  const complete = guessIndex >= CLUE_COUNT;

  if (complete) {
    nextSession.lockedAfterClue = CLUE_COUNT;
    return {
      session: nextSession,
      response: {
        guessIndex,
        temperature,
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
      temperature,
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

  const nextSession: GameSession = {
    ...session,
    lockedAfterClue: session.guesses.length,
  };

  return {
    session: nextSession,
    response: {
      complete: true,
      reveal: buildReveal(game, nextSession, now, clockOptions),
    },
  };
}
