import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HOW_TO_PLAY_STEPS, splitEmphasizedBody } from "./howToPlay";

describe("How to play press-and-hold copy", () => {
  it("explains place-your-pin with press and hold prominently", () => {
    const pinStep = HOW_TO_PLAY_STEPS.find((step) => step.showHoldDemo);
    assert.ok(pinStep);
    assert.equal(pinStep!.title, "📍 Place your pin");
    assert.equal(pinStep!.emphasize, "Press and hold");
    assert.ok(pinStep!.body.includes("Press and hold"));
    assert.ok(pinStep!.body.toLowerCase().includes("lock in your guess"));
    assert.ok(pinStep!.body.toLowerCase().includes("final"));
    assert.equal(pinStep!.showHoldDemo, true);
  });

  it("does not tell players to simply tap or click", () => {
    const joined = HOW_TO_PLAY_STEPS.map((step) => step.body).join(" ");
    assert.equal(/tap the map/i.test(joined), false);
    assert.equal(/click the map/i.test(joined), false);
  });

  it("uses a location-neutral opening step", () => {
    const first = HOW_TO_PLAY_STEPS[0]!;
    assert.ok(first.body.toLowerCase().includes("location"));
    assert.equal(/uk location/i.test(first.body), false);
  });

  it("explains the clue-ceiling scoring model", () => {
    const scoreStep = HOW_TO_PLAY_STEPS.find((step) =>
      step.title.toLowerCase().includes("25,000"),
    );
    assert.ok(scoreStep);
    assert.ok(scoreStep!.body.toLowerCase().includes("clue"));
    assert.ok(!scoreStep!.body.includes("5,000 per pin"));
  });

  it("splits body so Press and hold can be emphasized", () => {
    const parts = splitEmphasizedBody(
      "Press and hold on the map to lock in your guess.",
      "Press and hold",
    );
    assert.deepEqual(parts, {
      before: "",
      emphasis: "Press and hold",
      after: " on the map to lock in your guess.",
    });
  });
});
