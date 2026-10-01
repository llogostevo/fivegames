import { CLUE_COUNT } from "@/lib/game/constants";

export type PanelActionState = {
  /** Primary panel button label. */
  primaryLabel: string;
  /** Secondary panel button label, or null on the final clue. */
  secondaryLabel: string | null;
  /** Whether panel actions may be activated. */
  canAct: boolean;
  /**
   * Whether Submit / Lock actions should be visible.
   * Hidden (not merely disabled) until the current pin exists.
   */
  showActions: boolean;
  /** True when the primary action finishes the game. */
  isFinalClue: boolean;
};

export type PlacementPrompt = {
  title: string;
  detail: string;
};

/**
 * Explicit pin-placement copy for the active clue.
 * Makes “place another pin” obvious after each submit.
 */
export function getPlacementPrompt(options: {
  pinNumber: number;
  hasPin: boolean;
}): PlacementPrompt {
  const pinNumber = Math.min(Math.max(options.pinNumber, 1), CLUE_COUNT);

  if (options.hasPin) {
    return {
      title: `📍 Pin ${pinNumber} ready`,
      detail: "Drag the pin if you want to adjust it.",
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

/**
 * Derive right-hand panel action labels/enabled state.
 * The map only selects a pin; these actions commit the gameplay decision.
 */
export function getPanelActionState(options: {
  hasPin: boolean;
  clueNumber: number;
  isBusy?: boolean;
  isComplete?: boolean;
  isConfirming?: boolean;
}): PanelActionState {
  const {
    hasPin,
    clueNumber,
    isBusy = false,
    isComplete = false,
    isConfirming = false,
  } = options;

  const isFinalClue = clueNumber === CLUE_COUNT;
  const showActions = hasPin && !isComplete && !isConfirming;
  const canAct =
    showActions && !isBusy && clueNumber >= 1;

  return {
    primaryLabel: isFinalClue ? "Submit Final Guess →" : "Submit Guess →",
    secondaryLabel: isFinalClue ? null : "🎯 Lock Final Answer",
    canAct,
    showActions,
    isFinalClue,
  };
}
