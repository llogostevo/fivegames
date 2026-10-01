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

  it("placing pin reveals Pin X ready copy", () => {
    assert.deepEqual(getPlacementPrompt({ pinNumber: 1, hasPin: true }), {
      title: "📍 Pin 1 ready",
      detail: "Drag the pin if you want to adjust it.",
    });
    assert.deepEqual(getPlacementPrompt({ pinNumber: 2, hasPin: true }), {
      title: "📍 Pin 2 ready",
      detail: "Drag the pin if you want to adjust it.",
    });
  });
});

describe("getPanelActionState", () => {
  it("hides Submit Guess and Lock Final Answer before current pin exists", () => {
    const state = getPanelActionState({ hasPin: false, clueNumber: 1 });
    assert.equal(state.showActions, false);
    assert.equal(state.canAct, false);
    assert.equal(state.primaryLabel, "Submit Guess →");
    assert.equal(state.secondaryLabel, "🎯 Lock Final Answer");
  });

  it("placing pin reveals actions", () => {
    const state = getPanelActionState({ hasPin: true, clueNumber: 3 });
    assert.equal(state.showActions, true);
    assert.equal(state.canAct, true);
    assert.equal(state.primaryLabel, "Submit Guess →");
    assert.equal(state.secondaryLabel, "🎯 Lock Final Answer");
    assert.equal(state.isFinalClue, false);
  });

  it("submitting removes actions again for next clue (no pin yet)", () => {
    const afterSubmit = getPanelActionState({ hasPin: false, clueNumber: 3 });
    assert.equal(afterSubmit.showActions, false);
    assert.equal(afterSubmit.canAct, false);
    assert.deepEqual(getPlacementPrompt({ pinNumber: 3, hasPin: false }), {
      title: "📍 Place pin 3 of 5",
      detail: "Tap the map to make your next guess.",
    });
  });

  it("shows Submit Final Guess on clue 5 with no Lock Final Answer", () => {
    const state = getPanelActionState({ hasPin: true, clueNumber: 5 });
    assert.equal(state.showActions, true);
    assert.equal(state.canAct, true);
    assert.equal(state.primaryLabel, "Submit Final Guess →");
    assert.equal(state.secondaryLabel, null);
    assert.equal(state.isFinalClue, true);
  });

  it("keeps actions unavailable while confirming or busy", () => {
    assert.equal(
      getPanelActionState({
        hasPin: true,
        clueNumber: 2,
        isConfirming: true,
      }).showActions,
      false,
    );
    assert.equal(
      getPanelActionState({
        hasPin: true,
        clueNumber: 2,
        isBusy: true,
      }).canAct,
      false,
    );
    assert.equal(
      getPanelActionState({
        hasPin: true,
        clueNumber: 2,
        isBusy: true,
      }).showActions,
      true,
    );
  });
});
