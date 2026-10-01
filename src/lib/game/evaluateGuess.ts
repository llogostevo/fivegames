import { CLUE_COUNT } from "@/lib/game/constants";
import { compareGuessTemperature, distanceMeters } from "@/lib/game/distance";
import type { GameSession } from "@/lib/game/session";
import type { Coordinates } from "@/types/coordinates";
import type {
  GameDefinition,
  GameReveal,
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

export function lockGuess(options: {
  game: GameDefinition;
  session: GameSession;
  guess: unknown;
}): { session: GameSession; response: LockGuessResponse } {
  const { game, session } = options;

  if (session.gameId !== game.id) {
    throw new Error("Session does not match game");
  }

  if (session.guesses.length >= CLUE_COUNT) {
    throw new Error("All guesses are already locked");
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
    gameId: session.gameId,
    guesses: [...session.guesses, guess],
  };

  const guessIndex = nextSession.guesses.length;
  const complete = guessIndex >= CLUE_COUNT;

  let reveal: GameReveal | null = null;
  if (complete) {
    reveal = {
      answer: {
        name: game.answer.name,
        coordinates: target,
      },
      guesses: nextSession.guesses.map((lockedGuess) => ({
        ...lockedGuess,
        distanceMeters: Math.round(distanceMeters(lockedGuess, target)),
      })),
    };
  }

  const nextClueIndex = complete ? null : guessIndex;

  return {
    session: nextSession,
    response: {
      guessIndex,
      temperature,
      complete,
      nextClueIndex,
      nextClue: nextClueIndex === null ? null : game.clues[nextClueIndex],
      reveal,
    },
  };
}
