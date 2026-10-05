/**
 * Press-and-hold pin commitment.
 * Tune these values here only — do not scatter them through components.
 */

/** How long the player must hold before a pin is committed. */
export const PIN_COMMIT_HOLD_DURATION_MS = 800;

/**
 * Finger/cursor movement allowed during a hold without cancelling.
 * Small enough that a pan clearly cancels; large enough for natural touch jitter.
 */
export const PIN_HOLD_MOVE_TOLERANCE_PX = 12;

/** Progress ring diameter for mouse (cursor doesn't occlude much). */
export const PIN_HOLD_RING_SIZE_MOUSE_PX = 56;

/**
 * Progress ring diameter for touch/pen.
 * Large enough that the fill arc sits outside a typical thumb pad,
 * while the centre still marks the exact commit point.
 */
export const PIN_HOLD_RING_SIZE_TOUCH_PX = 104;

/** Short success buzz when a pin commits (ms). */
export const PIN_COMMIT_HAPTIC_MS = 14;

/** True when movement from the hold origin exceeds the tolerance. */
export function shouldCancelHoldForMovement(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  tolerancePx: number = PIN_HOLD_MOVE_TOLERANCE_PX,
): boolean {
  const dx = currentX - startX;
  const dy = currentY - startY;
  return dx * dx + dy * dy > tolerancePx * tolerancePx;
}

/** Hold progress in [0, 1] for a given elapsed duration. */
export function holdProgress(
  elapsedMs: number,
  durationMs: number = PIN_COMMIT_HOLD_DURATION_MS,
): number {
  if (durationMs <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, elapsedMs / durationMs));
}

/** Ring diameter for the active pointer — touch/pen gets the larger outer arc. */
export function holdRingSizePx(pointerType: string): number {
  return pointerType === "mouse"
    ? PIN_HOLD_RING_SIZE_MOUSE_PX
    : PIN_HOLD_RING_SIZE_TOUCH_PX;
}

/** Light haptic on successful pin commit (no-op when unsupported). */
export function triggerPinCommitHaptic(
  durationMs: number = PIN_COMMIT_HAPTIC_MS,
): void {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.vibrate !== "function"
  ) {
    return;
  }
  try {
    navigator.vibrate(durationMs);
  } catch {
    // Some browsers expose vibrate but reject the call.
  }
}
