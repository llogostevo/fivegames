import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PIN_COMMIT_HOLD_DURATION_MS,
  PIN_HOLD_MOVE_TOLERANCE_PX,
  PIN_HOLD_RING_OFFSET_Y_PX,
  holdProgress,
  holdRingOffsetYPx,
  holdRingScreenPosition,
  shouldCancelHoldForMovement,
} from "./pinHold";

describe("pin hold constants", () => {
  it("exposes a single tunable hold duration near 800ms", () => {
    assert.equal(PIN_COMMIT_HOLD_DURATION_MS, 800);
  });

  it("exposes a small movement tolerance for touch jitter", () => {
    assert.ok(PIN_HOLD_MOVE_TOLERANCE_PX >= 8);
    assert.ok(PIN_HOLD_MOVE_TOLERANCE_PX <= 20);
  });
});

describe("hold progress", () => {
  it("is zero before the hold starts and one at completion", () => {
    assert.equal(holdProgress(0), 0);
    assert.equal(holdProgress(PIN_COMMIT_HOLD_DURATION_MS), 1);
    assert.equal(holdProgress(PIN_COMMIT_HOLD_DURATION_MS + 50), 1);
  });

  it("fills proportionally during the hold", () => {
    assert.ok(holdProgress(400) > 0.4);
    assert.ok(holdProgress(400) < 0.6);
  });
});

describe("hold movement tolerance", () => {
  it("allows small natural movement", () => {
    assert.equal(
      shouldCancelHoldForMovement(100, 100, 105, 104),
      false,
    );
  });

  it("cancels when movement clearly exceeds the tolerance", () => {
    assert.equal(
      shouldCancelHoldForMovement(100, 100, 100 + PIN_HOLD_MOVE_TOLERANCE_PX + 1, 100),
      true,
    );
  });
});

describe("hold ring offset", () => {
  it("does not offset the ring for mouse", () => {
    assert.equal(holdRingOffsetYPx("mouse"), 0);
  });

  it("offsets the ring above touch and pen contacts", () => {
    assert.equal(holdRingOffsetYPx("touch"), PIN_HOLD_RING_OFFSET_Y_PX);
    assert.equal(holdRingOffsetYPx("pen"), PIN_HOLD_RING_OFFSET_Y_PX);
  });

  it("places the ring above the finger when there is room", () => {
    const ring = holdRingScreenPosition({
      touchX: 120,
      touchY: 200,
      offsetY: PIN_HOLD_RING_OFFSET_Y_PX,
      ringSize: 56,
      containerHeight: 500,
    });
    assert.equal(ring.x, 120);
    assert.equal(ring.y, 200 - PIN_HOLD_RING_OFFSET_Y_PX);
  });

  it("flips the ring below the finger near the top edge", () => {
    const ring = holdRingScreenPosition({
      touchX: 120,
      touchY: 40,
      offsetY: PIN_HOLD_RING_OFFSET_Y_PX,
      ringSize: 56,
      containerHeight: 500,
    });
    assert.equal(ring.x, 120);
    assert.ok(ring.y > 40);
  });
});
