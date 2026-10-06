import { CLUE_COUNT } from "@/lib/game/constants";
import { getNextReleaseAt, type ClockOptions } from "@/lib/game/date";
import { compareGuessTemperature, distanceMeters } from "@/lib/game/distance";
import {
  DEFAULT_GAME_MODE,
  scoringProfileForMode,
} from "@/lib/game/modes";
import {
  calculateFinalScore,
  maxScoreForProfile,
} from "@/lib/game/scoring";
import type { GameSession } from "@/lib/game/session";
import { getTheme } from "@/lib/game/themes";
import type {
  GameDefinition,
  GameReveal,
  RevealedGuess,
  TemperatureResult,
} from "@/types/game";

/**
 * Build the final reveal from a completed session.
 *
 * One final score = current clue maximum × accuracy of the final pin.
 * Journey pins are included for map/share/warmer-colder history only —
 * they do not add to the total.
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

  const mode = game.mode ?? session.mode ?? DEFAULT_GAME_MODE;
  const scoring = scoringProfileForMode(mode);

  const target = { lat: game.answer.lat, lng: game.answer.lng };
  const finalCoordinates = session.guesses[session.guesses.length - 1]!;
  const finalDistanceMeters = distanceMeters(finalCoordinates, target);
  const scored = calculateFinalScore({
    clueNumber: lockedAfterClue,
    distanceMeters: finalDistanceMeters,
    profile: scoring,
  });

  const guesses: RevealedGuess[] = session.guesses.map((guess, index) => {
    const previous = session.guesses[index - 1];
    let temperature: TemperatureResult | null = null;
    if (previous) {
      temperature = compareGuessTemperature(previous, guess, target);
    }

    const meters = distanceMeters(guess, target);
    return {
      lat: guess.lat,
      lng: guess.lng,
      distanceMeters: Math.round(meters),
      temperature,
      isFinalAnswer: index === session.guesses.length - 1,
    };
  });

  const theme = getTheme(game.theme);
  const detail = game.answerDetail;

  return {
    gameId: game.id,
    gameNumber: game.gameNumber,
    date: game.date,
    mode,
    themeId: game.theme,
    theme: theme.label,
    accent: theme.accent,
    accentSoft: theme.accentSoft,
    nextReleaseAt: getNextReleaseAt(now, clockOptions).toISOString(),
    answer: {
      name: game.answer.name,
      coordinates: target,
      ...(detail?.stadium ? { stadium: detail.stadium } : {}),
      ...(detail?.city ? { city: detail.city } : {}),
      ...(detail?.division ? { division: detail.division } : {}),
      ...(detail?.clubId ? { placeId: detail.clubId } : {}),
    },
    guesses,
    lockedAfterClue,
    cluesUsed: lockedAfterClue,
    complete: true,
    finalCoordinates,
    actualGuessCount: lockedAfterClue,
    totalScore: scored.totalScore,
    maxScore: maxScoreForProfile(scoring),
    clueMaximum: scored.clueMaximum,
    accuracyFactor: scored.accuracyFactor,
    finalDistanceMeters: Math.round(finalDistanceMeters),
    foundLocation,
    foundOnPin,
  };
}
