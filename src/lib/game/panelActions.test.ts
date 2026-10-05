import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPanelActionState, getPlacementPrompt } from "./panelActions";
import {
  PIN_COMMIT_HOLD_DURATION_MS,
  PIN_HOLD_MOVE_TOLERANCE_PX,
} from "./pinHold";

describe("getPlacementPrompt", () => {
  it("clue 1 before pin → Press & hold compact copy", () => {
    assert.deepEqual(getPlacementPrompt({ pinNumber: 1, hasPin: false }), {
      title: "📍 Press & hold to place pin 1 of 5",
      detail: "Keep holding until the circle fills.",
    });
  });

  it("clue 2 before pin → Press & hold compact copy", () => {
    assert.deepEqual(getPlacementPrompt({ pinNumber: 2, hasPin: false }), {
      title: "📍 Press & hold to place pin 2 of 5",
      detail: "Keep holding until the circle fills.",
    });
  });

  it("resumed game at clue 3 with no current pin shows Press & hold", () => {
    assert.deepEqual(getPlacementPrompt({ pinNumber: 3, hasPin: false }), {
      title: "📍 Press & hold to place pin 3 of 5",
      detail: "Keep holding until the circle fills.",
    });
  });
});

describe("getPanelActionState", () => {
  it("does not show persistent Submit / Lock actions (modal owns them)", () => {
    const beforePin = getPanelActionState({ hasPin: false, clueNumber: 1 });
    assert.equal(beforePin.showActions, false);
    assert.equal(beforePin.canAct, false);

    const afterPin = getPanelActionState({ hasPin: true, clueNumber: 2 });
    assert.equal(afterPin.showActions, false);
  });

  it("still identifies the final clue for modal branching", () => {
    const state = getPanelActionState({ hasPin: true, clueNumber: 5 });
    assert.equal(state.isFinalClue, true);
    assert.equal(state.secondaryLabel, null);
  });
});

describe("hold mechanic constants unchanged by discoverability work", () => {
  it("keeps the existing hold duration and movement tolerance", () => {
    assert.equal(PIN_COMMIT_HOLD_DURATION_MS, 800);
    assert.equal(PIN_HOLD_MOVE_TOLERANCE_PX, 12);
  });
});
