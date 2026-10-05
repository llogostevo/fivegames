import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decisionModalShowsTemperature,
  getMapPlacementCopy,
  isFinalClueNumber,
  lockConfirmCommitsGuess,
  lockConfirmExplanation,
  shouldShowTemperatureInNextClueModal,
  temperatureFeedbackCopy,
  toDecisionFromLockConfirm,
  toLockConfirmState,
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
});

describe("map placement copy", () => {
  it("clue 1 before pin → Place pin 1 of 5", () => {
    assert.deepEqual(
      getMapPlacementCopy({
        pinNumber: 1,
        hasPin: false,
        isAdjusting: false,
        modalOpen: false,
      }),
      {
        title: "📍 Place pin 1 of 5",
        detail: "Tap the map to make your first guess.",
      },
    );
  });

  it("clue 2 before pin → Place pin 2 of 5", () => {
    assert.deepEqual(
      getMapPlacementCopy({
        pinNumber: 2,
        hasPin: false,
        isAdjusting: false,
        modalOpen: false,
      }),
      {
        title: "📍 Place pin 2 of 5",
        detail: "Tap the map to make your next guess.",
      },
    );
  });

  it("resumed clue 3 with no pin shows Place pin 3 of 5", () => {
    assert.deepEqual(
      getMapPlacementCopy({
        pinNumber: 3,
        hasPin: false,
        isAdjusting: false,
        modalOpen: false,
      })?.title,
      "📍 Place pin 3 of 5",
    );
  });

  it("adjust mode explains no feedback", () => {
    const copy = getMapPlacementCopy({
      pinNumber: 2,
      hasPin: true,
      isAdjusting: true,
      modalOpen: false,
    });
    assert.ok(copy?.title.includes("Adjust pin 2"));
    assert.ok(copy?.detail.toLowerCase().includes("no feedback"));
  });

  it("hides placement chrome while decision/next-clue modal is open", () => {
    assert.equal(
      getMapPlacementCopy({
        pinNumber: 2,
        hasPin: true,
        isAdjusting: false,
        modalOpen: true,
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

    const colder = temperatureFeedbackCopy("colder");
    assert.equal(colder.word, "Colder");
    assert.equal(colder.sentence, "Your last pin was further away.");
  });
});

describe("lock confirmation state", () => {
  it("clicking Lock Final Answer opens confirmation without committing", () => {
    const confirm = toLockConfirmState({ pinNumber: 2, isFinalClue: false });
    assert.equal(confirm.type, "lockConfirm");
    assert.equal(confirm.pinNumber, 2);
    assert.equal(lockConfirmCommitsGuess(), false);
  });

  it("Go Back returns to the decision state with the same pin", () => {
    const decision = toDecisionFromLockConfirm({
      pinNumber: 3,
      isFinalClue: false,
    });
    assert.deepEqual(decision, {
      type: "decision",
      pinNumber: 3,
      isFinalClue: false,
    });
  });

  it("pins 1–4 mention remaining clues; pin 5 does not", () => {
    const early = lockConfirmExplanation(false);
    assert.ok(early.includes("remaining clues"));
    assert.ok(early.startsWith("This ends today's game."));

    const final = lockConfirmExplanation(true);
    assert.ok(!final.includes("remaining clues"));
    assert.equal(
      final,
      "This ends today's game. Your current pin will be used as your final answer.",
    );
  });

  it("opening confirmation does not imply progression or warmer/colder", () => {
    assert.equal(lockConfirmCommitsGuess(), false);
    assert.equal(decisionModalShowsTemperature(), false);
  });
});
