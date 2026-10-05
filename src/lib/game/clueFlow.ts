import { CLUE_COUNT } from "@/lib/game/constants";
import type { TemperatureResult } from "@/types/game";

/** Non-dismissible gameplay modal after the How to play / results layers. */
export type ClueFlowModalState =
  | { type: "decision"; pinNumber: number; isFinalClue: boolean }
  | { type: "lockConfirm"; pinNumber: number; isFinalClue: boolean }
  | {
      type: "nextClue";
      /** Null for Pin 1 → Clue 2 (no previous pin to compare). */
      temperature: TemperatureResult | null;
      clueNumber: number;
      clueText: string;
      nextPinNumber: number;
    }
  | {
      type: "error";
      message: string;
      retry: "getClue" | "lock";
    };

export function isFinalClueNumber(pinNumber: number): boolean {
  return pinNumber === CLUE_COUNT;
}

/** Pure transition: decision → lock confirmation (no server side-effects). */
export function toLockConfirmState(decision: {
  pinNumber: number;
  isFinalClue: boolean;
}): Extract<ClueFlowModalState, { type: "lockConfirm" }> {
  return {
    type: "lockConfirm",
    pinNumber: decision.pinNumber,
    isFinalClue: decision.isFinalClue,
  };
}

/** Pure transition: lock confirmation → decision (no server side-effects). */
export function toDecisionFromLockConfirm(confirm: {
  pinNumber: number;
  isFinalClue: boolean;
}): Extract<ClueFlowModalState, { type: "decision" }> {
  return {
    type: "decision",
    pinNumber: confirm.pinNumber,
    isFinalClue: confirm.isFinalClue,
  };
}

/** Context-aware lock confirmation body copy. */
export function lockConfirmExplanation(isFinalClue: boolean): string {
  if (isFinalClue) {
    return "This ends today's game. Your current pin will be used as your final answer.";
  }
  return "This ends today's game. Your current pin will be used as your final answer for all remaining clues.";
}

/** Opening lock confirmation must never count as committing a guess. */
export function lockConfirmCommitsGuess(): false {
  return false;
}

/** Decision modal never includes warmer/colder — only pin placement confirmation. */
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

export function getMapPlacementCopy(options: {
  pinNumber: number;
  hasPin: boolean;
  isAdjusting: boolean;
  modalOpen: boolean;
}): { title: string; detail: string } | null {
  const pinNumber = Math.min(Math.max(options.pinNumber, 1), CLUE_COUNT);

  // Modal owns the interaction while open (except adjust, when map is active).
  if (options.modalOpen && !options.isAdjusting) {
    return null;
  }

  if (options.isAdjusting) {
    return {
      title: `📍 Adjust pin ${pinNumber}`,
      detail: "Drag or tap the map to reposition. No feedback until you decide.",
    };
  }

  if (options.hasPin) {
    return {
      title: `📍 Pin ${pinNumber} ready`,
      detail: "Choose what to do next.",
    };
  }

  if (pinNumber === 1) {
    return {
      title: `📍 Place pin 1 of ${CLUE_COUNT}`,
      detail: "Tap the map to make your first guess.",
    };
  }

  return {
    title: `📍 Place pin ${pinNumber} of ${CLUE_COUNT}`,
    detail: "Tap the map to make your next guess.",
  };
}
