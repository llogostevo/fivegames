import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatConnectionLabel } from "./connectionLabel";

describe("formatConnectionLabel", () => {
  it("maps known Harry Potter and Taylor Swift slugs", () => {
    assert.equal(formatConnectionLabel("actor-birthplace"), "Actor birthplace");
    assert.equal(formatConnectionLabel("filming"), "Filming location");
    assert.equal(formatConnectionLabel("music-video"), "Music video location");
    assert.equal(formatConnectionLabel("tour"), "Tour venue");
  });

  it("returns null for empty values", () => {
    assert.equal(formatConnectionLabel(null), null);
    assert.equal(formatConnectionLabel(undefined), null);
    assert.equal(formatConnectionLabel(""), null);
    assert.equal(formatConnectionLabel("  "), null);
  });

  it("title-cases unknown slugs", () => {
    assert.equal(formatConnectionLabel("special-event"), "Special Event");
  });
});
