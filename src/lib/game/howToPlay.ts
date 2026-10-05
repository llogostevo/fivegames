/** Copy for the How to play modal — kept testable and consistent with in-game UX. */

import {
  DEFAULT_GAME_MODE,
  scoringProfileForMode,
  type GameMode,
} from "@/lib/game/modes";
import { maxScoreForProfile } from "@/lib/game/scoring";

export type HowToPlayStep = {
  title: string;
  body: string;
  /** When true, render the press → circle → pin demo. */
  showHoldDemo?: boolean;
  /** Substring of body to emphasize (e.g. Press and hold). */
  emphasize?: string;
};

export function howToPlayStepsForMode(
  mode: GameMode = DEFAULT_GAME_MODE,
): HowToPlayStep[] {
  const maxScore = maxScoreForProfile(scoringProfileForMode(mode));
  const maxLabel = maxScore.toLocaleString("en-GB");

  return [
    {
      title: "Five clues, one place",
      body: "Each day hides a location. Clues get more specific.",
    },
    {
      title: "📍 Place your pin",
      body: "Press and hold on the map to lock in your guess. Once the pin drops, your guess is final.",
      emphasize: "Press and hold",
      showHoldDemo: true,
    },
    {
      title: "Finish or buy a clue",
      body: "Finish here with your current pin, or get another clue — each clue lowers the maximum score you can achieve.",
    },
    {
      title: "Warmer or colder",
      body: "Only after you get another clue will you learn if you got warmer or colder.",
    },
    {
      title: `One score out of ${maxLabel}`,
      body: "Your final score is based on how few clues you needed and how close your final pin was. Perfect score: find it on Clue 1.",
    },
  ];
}

/** @deprecated Prefer howToPlayStepsForMode(mode) */
export const HOW_TO_PLAY_STEPS = howToPlayStepsForMode(DEFAULT_GAME_MODE);

/** Split body so the emphasized phrase can be bolded in the UI. */
export function splitEmphasizedBody(
  body: string,
  emphasize: string | undefined,
): { before: string; emphasis: string; after: string } | null {
  if (!emphasize) {
    return null;
  }
  const index = body.indexOf(emphasize);
  if (index < 0) {
    return null;
  }
  return {
    before: body.slice(0, index),
    emphasis: emphasize,
    after: body.slice(index + emphasize.length),
  };
}
