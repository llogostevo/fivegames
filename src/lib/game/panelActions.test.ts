import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPanelActionState } from "./panelActions";

describe("getPanelActionState", () => {
  it("disables actions before a pin is placed", () => {
    const state = getPanelActionState({ hasPin: false, clueNumber: 1 });
    assert.equal(state.canAct, false);
    assert.equal(state.primaryLabel, "Get Clue 2 →");
    assert.equal(state.secondaryLabel, "🎯 Lock Final Answer");
  });

  it("enables both actions once a pin is placed on clues 1–4", () => {
    const state = getPanelActionState({ hasPin: true, clueNumber: 3 });
    assert.equal(state.canAct, true);
    assert.equal(state.primaryLabel, "Get Clue 4 →");
    assert.equal(state.secondaryLabel, "🎯 Lock Final Answer");
    assert.equal(state.isFinalClue, false);
  });

  it("shows See Result on clue 5 with no Lock Final Answer", () => {
    const state = getPanelActionState({ hasPin: true, clueNumber: 5 });
    assert.equal(state.canAct, true);
    assert.equal(state.primaryLabel, "See Result →");
    assert.equal(state.secondaryLabel, null);
    assert.equal(state.isFinalClue, true);
  });

  it("keeps actions disabled while confirming or busy", () => {
    assert.equal(
      getPanelActionState({
        hasPin: true,
        clueNumber: 2,
        isConfirming: true,
      }).canAct,
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
  });
});
