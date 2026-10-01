import { CLUE_COUNT } from "@/lib/game/constants";

export type PanelActionState = {
  /** Primary panel button label. */
  primaryLabel: string;
  /** Secondary panel button label, or null on the final clue. */
  secondaryLabel: string | null;
  /** Whether panel actions may be activated. */
  canAct: boolean;
  /** True when the primary action finishes the game. */
  isFinalClue: boolean;
};

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
  const canAct =
    hasPin && !isBusy && !isComplete && !isConfirming && clueNumber >= 1;

  return {
    primaryLabel: isFinalClue
      ? "See Result →"
      : `Get Clue ${clueNumber + 1} →`,
    secondaryLabel: isFinalClue ? null : "🎯 Lock Final Answer",
    canAct,
    isFinalClue,
  };
}
