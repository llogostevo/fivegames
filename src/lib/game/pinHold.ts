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

/**
 * On touch/pen, lift the progress ring this many pixels above the contact
 * point so the thumb does not cover it. Mouse stays centred on the cursor.
 */
export const PIN_HOLD_RING_OFFSET_Y_PX = 56;

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

/** How far above the contact point to draw the hold ring (0 for mouse). */
export function holdRingOffsetYPx(pointerType: string): number {
  return pointerType === "mouse" ? 0 : PIN_HOLD_RING_OFFSET_Y_PX;
}

/**
 * Screen position for the progress ring.
 * Prefer above the finger; flip below near the top edge; clamp in-bounds.
 * Commit coordinates stay at the original touch point — only the ring moves.
 */
export function holdRingScreenPosition(options: {
  touchX: number;
  touchY: number;
  offsetY: number;
  ringSize: number;
  containerHeight: number;
}): { x: number; y: number } {
  const half = options.ringSize / 2;
  const pad = 4;
  let y = options.touchY - options.offsetY;

  if (options.offsetY > 0 && y < half + pad) {
    y = options.touchY + options.offsetY;
  }

  const minY = half + pad;
  const maxY = Math.max(minY, options.containerHeight - half - pad);
  y = Math.min(Math.max(y, minY), maxY);

  return { x: options.touchX, y };
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
