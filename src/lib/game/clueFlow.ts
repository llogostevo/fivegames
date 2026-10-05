import { CLUE_COUNT } from "@/lib/game/constants";
import { getClueMaxScore, getNextClueMaxScore } from "@/lib/game/scoring";
import type { TemperatureResult } from "@/types/game";

/** Non-dismissible gameplay modal after the How to play / results layers. */
export type ClueFlowModalState =
  | {
      type: "decision";
      pinNumber: number;
      isFinalClue: boolean;
      currentMaxScore: number;
      nextMaxScore: number | null;
    }
  | {
      type: "finishConfirm";
      pinNumber: number;
      isFinalClue: boolean;
      currentMaxScore: number;
      nextMaxScore: number | null;
    }
  | {
      type: "nextClue";
      /** Null for Pin 1 → Clue 2 (no previous pin to compare). */
      temperature: TemperatureResult | null;
      clueNumber: number;
      clueText: string;
      nextPinNumber: number;
      currentMaxScore: number;
    }
  | {
      type: "error";
      message: string;
      retry: "getClue" | "finish";
    };

export function isFinalClueNumber(pinNumber: number): boolean {
  return pinNumber === CLUE_COUNT;
}

export function decisionScoreContext(pinNumber: number): {
  currentMaxScore: number;
  nextMaxScore: number | null;
  isFinalClue: boolean;
} {
  return {
    currentMaxScore: getClueMaxScore(pinNumber),
    nextMaxScore: getNextClueMaxScore(pinNumber),
    isFinalClue: isFinalClueNumber(pinNumber),
  };
}

/** Pure transition: decision → finish confirmation (no server side-effects). */
export function toFinishConfirmState(decision: {
  pinNumber: number;
  isFinalClue: boolean;
  currentMaxScore: number;
  nextMaxScore: number | null;
}): Extract<ClueFlowModalState, { type: "finishConfirm" }> {
  return {
    type: "finishConfirm",
    pinNumber: decision.pinNumber,
    isFinalClue: decision.isFinalClue,
    currentMaxScore: decision.currentMaxScore,
    nextMaxScore: decision.nextMaxScore,
  };
}

/** Pure transition: finish confirmation → decision (no server side-effects). */
export function toDecisionFromFinishConfirm(confirm: {
  pinNumber: number;
  isFinalClue: boolean;
  currentMaxScore: number;
  nextMaxScore: number | null;
}): Extract<ClueFlowModalState, { type: "decision" }> {
  return {
    type: "decision",
    pinNumber: confirm.pinNumber,
    isFinalClue: confirm.isFinalClue,
    currentMaxScore: confirm.currentMaxScore,
    nextMaxScore: confirm.nextMaxScore,
  };
}

export function finishConfirmExplanation(): string {
  return "This ends today's game using your current location.";
}

/** Opening finish confirmation must never count as committing a guess. */
export function finishConfirmCommitsGuess(): false {
  return false;
}

/** Decision modal never includes warmer/colder — only post-commit choices. */
export function decisionModalShowsTemperature(): false {
  return false;
}

/**
 * Warmer/colder is only shown in the next-clue modal, and only when there was
 * a previous committed pin (pinNumber >= 2 when committing).
 */
export function shouldShowTemperatureInNextClueModal(
  temperature: TemperatureResult | null,
): boolean {
  return temperature !== null;
}

export function temperatureFeedbackCopy(
  temperature: TemperatureResult,
): { emoji: string; word: string; sentence: string } {
  if (temperature === "warmer") {
    return {
      emoji: "🔥",
      word: "Warmer",
      sentence: "Your last pin was closer.",
    };
  }
  if (temperature === "colder") {
    return {
      emoji: "🧊",
      word: "Colder",
      sentence: "Your last pin was further away.",
    };
  }
  return {
    emoji: "➡️",
    word: "Same",
    sentence: "Your last pin was about as far away.",
  };
}

export function formatScoreCeiling(score: number): string {
  return score.toLocaleString("en-GB");
}

export function getMapPlacementCopy(options: {
  pinNumber: number;
  /** True while a hold/commit is in flight or decision modal owns the UI. */
  modalOpen: boolean;
  /** True when the active clue already has a committed pin. */
  pinCommitted: boolean;
}): { title: string; detail: string } | null {
  const pinNumber = Math.min(Math.max(options.pinNumber, 1), CLUE_COUNT);

  if (options.modalOpen || options.pinCommitted) {
    return null;
  }

  return {
    title: `📍 Press & hold to place pin ${pinNumber} of ${CLUE_COUNT}`,
    detail: "Keep holding until the circle fills.",
  };
}
