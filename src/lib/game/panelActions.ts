import { getMapPlacementCopy } from "@/lib/game/clueFlow";
import { CLUE_COUNT } from "@/lib/game/constants";

export type PlacementPrompt = {
  title: string;
  detail: string;
};

/**
 * @deprecated Prefer getMapPlacementCopy from clueFlow.
 * Kept for transitional tests / call sites.
 */
export function getPlacementPrompt(options: {
  pinNumber: number;
  hasPin: boolean;
}): PlacementPrompt {
  return (
    getMapPlacementCopy({
      pinNumber: options.pinNumber,
      pinCommitted: options.hasPin,
      modalOpen: false,
    }) ?? {
      title: `📍 Press & hold to place pin ${options.pinNumber} of ${CLUE_COUNT}`,
      detail: "Keep holding until the circle fills.",
    }
  );
}

export type PanelActionState = {
  primaryLabel: string;
  secondaryLabel: string | null;
  canAct: boolean;
  showActions: boolean;
  isFinalClue: boolean;
};

/**
 * Legacy panel actions — the map UI no longer surfaces these persistently.
 * Decision actions live in ClueFlowModal after a pin is committed.
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
  const showActions = false;
  const canAct =
    hasPin && !isBusy && !isComplete && !isConfirming && clueNumber >= 1;

  return {
    primaryLabel: isFinalClue ? "Submit Final Guess →" : "Submit Guess →",
    secondaryLabel: isFinalClue ? null : "🎯 Lock Final Answer",
    canAct,
    showActions,
    isFinalClue,
  };
}
