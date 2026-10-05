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
