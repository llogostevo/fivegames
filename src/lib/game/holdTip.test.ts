import assert from "node:assert/strict";
import { afterEach, before, describe, it } from "node:test";

import {
  HOLD_TIP_SEEN_KEY,
  SHORT_TAP_COACH_FIRST,
  SHORT_TAP_COACH_REPEAT,
  markHoldTipSeen,
  readHoldTipSeen,
  shouldCoachShortTap,
  shouldShowHoldTip,
  shortTapCoachMessage,
} from "./holdTip";

const memory = new Map<string, string>();

before(() => {
  const localStorage = {
    getItem(key: string) {
      return memory.has(key) ? memory.get(key)! : null;
    },
    setItem(key: string, value: string) {
      memory.set(key, String(value));
    },
    removeItem(key: string) {
      memory.delete(key);
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: { localStorage },
    configurable: true,
  });
});

describe("first-time hold tip", () => {
  afterEach(() => {
    memory.clear();
  });

  it("shows the enhanced hint when tip has not been seen", () => {
    assert.equal(shouldShowHoldTip(false), true);
    assert.equal(shouldShowHoldTip(true), false);
  });

  it("marks the tip as seen in localStorage after the first successful pin", () => {
    assert.equal(readHoldTipSeen(), false);
    markHoldTipSeen();
    assert.equal(readHoldTipSeen(), true);
    assert.equal(memory.get(HOLD_TIP_SEEN_KEY), "true");
  });

  it("treats returning players as tip-seen", () => {
    memory.set(HOLD_TIP_SEEN_KEY, "true");
    assert.equal(readHoldTipSeen(), true);
    assert.equal(shouldShowHoldTip(readHoldTipSeen()), false);
  });

  it("shows the tip again when localStorage value is invalid", () => {
    memory.set(HOLD_TIP_SEEN_KEY, "yes");
    assert.equal(readHoldTipSeen(), false);
    assert.equal(shouldShowHoldTip(readHoldTipSeen()), true);
  });
});

describe("short-tap coaching", () => {
  it("coaches gently on the first short tap", () => {
    assert.equal(shortTapCoachMessage(0), SHORT_TAP_COACH_FIRST);
    assert.equal(shortTapCoachMessage(0), "Hold a little longer…");
  });

  it("gives a clearer instruction on a repeated short tap", () => {
    assert.equal(shortTapCoachMessage(1), SHORT_TAP_COACH_REPEAT);
    assert.equal(shortTapCoachMessage(2), SHORT_TAP_COACH_REPEAT);
    assert.ok(SHORT_TAP_COACH_REPEAT.includes("Press & hold"));
  });

  it("does not coach when the player was panning or dragging", () => {
    assert.equal(
      shouldCoachShortTap({ completed: false, moved: true }),
      false,
    );
  });

  it("coaches only for a stationary early release", () => {
    assert.equal(
      shouldCoachShortTap({ completed: false, moved: false }),
      true,
    );
    assert.equal(
      shouldCoachShortTap({ completed: true, moved: false }),
      false,
    );
  });
});
