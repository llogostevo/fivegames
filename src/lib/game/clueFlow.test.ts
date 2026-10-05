import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decisionModalShowsTemperature,
  decisionScoreContext,
  finishConfirmCommitsGuess,
  finishConfirmExplanation,
  getMapPlacementCopy,
  isFinalClueNumber,
  shouldShowTemperatureInNextClueModal,
  temperatureFeedbackCopy,
  toDecisionFromFinishConfirm,
  toFinishConfirmState,
} from "./clueFlow";

describe("clue flow decision rules", () => {
  it("decision modal never shows warmer/colder", () => {
    assert.equal(decisionModalShowsTemperature(), false);
  });

  it("next-clue modal omits warmer/colder after pin 1", () => {
    assert.equal(shouldShowTemperatureInNextClueModal(null), false);
  });

  it("next-clue modal shows warmer/colder after pin 2+", () => {
    assert.equal(shouldShowTemperatureInNextClueModal("warmer"), true);
    assert.equal(shouldShowTemperatureInNextClueModal("colder"), true);
  });

  it("clue 5 is the final clue (no Get another clue)", () => {
    assert.equal(isFinalClueNumber(5), true);
    assert.equal(isFinalClueNumber(4), false);
  });

  it("exposes current and next score ceilings for the decision UI", () => {
    assert.deepEqual(decisionScoreContext(2), {
      currentMaxScore: 22_500,
      nextMaxScore: 20_000,
      isFinalClue: false,
    });
    assert.deepEqual(decisionScoreContext(5), {
      currentMaxScore: 15_000,
      nextMaxScore: null,
      isFinalClue: true,
    });
  });
});

describe("map placement copy", () => {
  it("uses compact Press & hold instruction with current pin number", () => {
    assert.deepEqual(
      getMapPlacementCopy({
        pinNumber: 1,
        pinCommitted: false,
        modalOpen: false,
      }),
      {
        title: "📍 Press & hold to place pin 1 of 5",
        detail: "Keep holding until the circle fills above your finger.",
      },
    );
  });

  it("updates the pin number for later clues", () => {
    assert.deepEqual(
      getMapPlacementCopy({
        pinNumber: 2,
        pinCommitted: false,
        modalOpen: false,
      }),
      {
        title: "📍 Press & hold to place pin 2 of 5",
        detail: "Keep holding until the circle fills above your finger.",
      },
    );
  });

  it("hides placement chrome once a pin is committed", () => {
    assert.equal(
      getMapPlacementCopy({
        pinNumber: 2,
        pinCommitted: true,
        modalOpen: false,
      }),
      null,
    );
  });
});

describe("temperature feedback copy", () => {
  it("uses short warmer/colder wording without distances", () => {
    const warmer = temperatureFeedbackCopy("warmer");
    assert.equal(warmer.word, "Warmer");
    assert.equal(warmer.sentence, "Your last pin was closer.");
    assert.ok(!warmer.sentence.includes("km"));
  });
});

describe("Finish Here confirmation state", () => {
  it("opens confirmation without committing", () => {
    const confirm = toFinishConfirmState({
      pinNumber: 2,
      isFinalClue: false,
      currentMaxScore: 22_500,
      nextMaxScore: 20_000,
    });
    assert.equal(confirm.type, "finishConfirm");
    assert.equal(confirm.pinNumber, 2);
    assert.equal(finishConfirmCommitsGuess(), false);
  });

  it("Go Back returns to the decision state with the same pin and ceilings", () => {
    const decision = toDecisionFromFinishConfirm({
      pinNumber: 3,
      isFinalClue: false,
      currentMaxScore: 20_000,
      nextMaxScore: 17_500,
    });
    assert.deepEqual(decision, {
      type: "decision",
      pinNumber: 3,
      isFinalClue: false,
      currentMaxScore: 20_000,
      nextMaxScore: 17_500,
    });
  });

  it("uses Finish Here confirmation copy", () => {
    assert.equal(
      finishConfirmExplanation(),
      "This ends today's game using your current location.",
    );
  });
});
