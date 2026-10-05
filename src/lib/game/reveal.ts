import { CLUE_COUNT } from "@/lib/game/constants";
import { getNextReleaseAt, type ClockOptions } from "@/lib/game/date";
import { compareGuessTemperature, distanceMeters } from "@/lib/game/distance";
import { FOUND_PIN_SCORE } from "@/lib/game/found";
import { SCORING, calculateScore } from "@/lib/game/scoring";
import type { GameSession } from "@/lib/game/session";
import { getTheme } from "@/lib/game/themes";
import type { Coordinates } from "@/types/coordinates";
import type {
  GameDefinition,
  GameReveal,
  RevealedGuess,
  TemperatureResult,
} from "@/types/game";

function scoreGuess(
  guess: Coordinates,
  target: Coordinates,
  previous: Coordinates | undefined,
): Pick<RevealedGuess, "distanceMeters" | "score" | "temperature"> {
  const meters = distanceMeters(guess, target);
  let temperature: TemperatureResult | null = null;
  if (previous) {
    temperature = compareGuessTemperature(previous, guess, target);
  }

  return {
    distanceMeters: Math.round(meters),
    score: calculateScore(meters / 1000),
    temperature,
  };
}

/**
 * Build the final reveal payload from a completed session.
 * Actual guesses remain distinguishable from carried-forward scoring slots.
 *
 * When session.foundLocation is true, the successful pin and all carried-forward
 * slots score FOUND_PIN_SCORE (5,000) regardless of exact distance inside the radius.
 */
export function buildReveal(
  game: GameDefinition,
  session: GameSession,
  now: Date = new Date(),
  clockOptions: ClockOptions = {},
): GameReveal {
  if (session.guesses.length === 0) {
    throw new Error("Cannot reveal a game with no guesses");
  }

  const lockedAfterClue = session.lockedAfterClue ?? session.guesses.length;
  if (lockedAfterClue < 1 || lockedAfterClue > CLUE_COUNT) {
    throw new Error("Invalid lockedAfterClue");
  }

  if (session.guesses.length !== lockedAfterClue) {
    throw new Error("Guess count must match lockedAfterClue");
  }

  const foundLocation = session.foundLocation === true;
  const foundOnPin = foundLocation
    ? (session.foundOnPin ?? lockedAfterClue)
    : null;

  const target = { lat: game.answer.lat, lng: game.answer.lng };
  const finalCoordinates = session.guesses[session.guesses.length - 1];
  const finalScoreParts = scoreGuess(
    finalCoordinates,
    target,
    session.guesses[session.guesses.length - 2],
  );

  if (foundLocation) {
    finalScoreParts.score = FOUND_PIN_SCORE;
  }

  const guesses: RevealedGuess[] = [];

  for (let index = 0; index < CLUE_COUNT; index += 1) {
    const clueNumber = index + 1;

    if (clueNumber <= lockedAfterClue) {
      const guess = session.guesses[index];
      const previous = session.guesses[index - 1];
      const scored = scoreGuess(guess, target, previous);

      if (foundLocation && clueNumber === lockedAfterClue) {
        scored.score = FOUND_PIN_SCORE;
      }

      guesses.push({
        lat: guess.lat,
        lng: guess.lng,
        ...scored,
        carriedForward: false,
        isFinalAnswer: clueNumber === lockedAfterClue,
      });
      continue;
    }

    // Unused clues: score the final pin again, but mark as carried forward.
    guesses.push({
      lat: finalCoordinates.lat,
      lng: finalCoordinates.lng,
      distanceMeters: null,
      score: finalScoreParts.score,
      temperature: null,
      carriedForward: true,
      isFinalAnswer: false,
    });
  }

  const totalScore = guesses.reduce((sum, guess) => sum + guess.score, 0);
  const theme = getTheme(game.theme);

  return {
    gameId: game.id,
    gameNumber: game.gameNumber,
    date: game.date,
    themeId: game.theme,
    theme: theme.label,
    accent: theme.accent,
    accentSoft: theme.accentSoft,
    nextReleaseAt: getNextReleaseAt(now, clockOptions).toISOString(),
    answer: {
      name: game.answer.name,
      coordinates: target,
    },
    guesses,
    lockedAfterClue,
    cluesUsed: lockedAfterClue,
    complete: true,
    finalCoordinates,
    actualGuessCount: lockedAfterClue,
    totalScore,
    maxScore: SCORING.MAX_TOTAL_POINTS,
    foundLocation,
    foundOnPin,
  };
}
