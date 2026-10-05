import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPanelActionState, getPlacementPrompt } from "./panelActions";

describe("getPlacementPrompt", () => {
  it("clue 1 before pin → Place pin 1 of 5", () => {
    assert.deepEqual(getPlacementPrompt({ pinNumber: 1, hasPin: false }), {
      title: "📍 Place pin 1 of 5",
      detail: "Tap the map to make your first guess.",
    });
  });

  it("clue 2 before pin → Place pin 2 of 5", () => {
    assert.deepEqual(getPlacementPrompt({ pinNumber: 2, hasPin: false }), {
      title: "📍 Place pin 2 of 5",
      detail: "Tap the map to make your next guess.",
    });
  });

  it("resumed game at clue 3 with no current pin shows Place pin 3 of 5", () => {
    assert.deepEqual(getPlacementPrompt({ pinNumber: 3, hasPin: false }), {
      title: "📍 Place pin 3 of 5",
      detail: "Tap the map to make your next guess.",
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
