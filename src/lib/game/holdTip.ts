/**
 * First-time press-and-hold discoverability helpers.
 * Does not affect commit timing or scoring — UI/onboarding only.
 */

export const HOLD_TIP_SEEN_KEY = "pin5_hold_tip_seen";

/** How long short-tap coaching stays visible before fading out. */
export const SHORT_TAP_COACH_DURATION_MS = 2_200;

export const SHORT_TAP_COACH_FIRST = "Hold a little longer…";
export const SHORT_TAP_COACH_REPEAT = "Press & hold until the circle fills";

export function readHoldTipSeen(): boolean {
  try {
    const storage =
      typeof window !== "undefined" ? window.localStorage : null;
    if (!storage) {
      return false;
    }
    return storage.getItem(HOLD_TIP_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

export function markHoldTipSeen(): void {
  try {
    const storage =
      typeof window !== "undefined" ? window.localStorage : null;
    if (!storage) {
      return;
    }
    storage.setItem(HOLD_TIP_SEEN_KEY, "true");
  } catch {
    // Ignore quota / private-mode failures — tip may reappear.
  }
}

/** Whether the enhanced first-time map hint should show. */
export function shouldShowHoldTip(tipSeen: boolean): boolean {
  return !tipSeen;
}

/**
 * Short-tap coaching level from how many stationary early-releases
 * have happened since the last successful commit (0-based count before this tap).
 */
export function shortTapCoachMessage(priorShortTapCount: number): string {
  if (priorShortTapCount <= 0) {
    return SHORT_TAP_COACH_FIRST;
  }
  return SHORT_TAP_COACH_REPEAT;
}

/**
 * Coach only for a stationary early release — not after a completed hold,
 * and not when movement cancelled the hold (pan/drag).
 */
export function shouldCoachShortTap(options: {
  completed: boolean;
  moved: boolean;
}): boolean {
  return !options.completed && !options.moved;
}
