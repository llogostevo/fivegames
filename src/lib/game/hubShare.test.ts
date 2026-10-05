import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hubTileAriaLabel, buildHubDayShareText } from "./hubShare";
import { HUB_GAMES } from "./hubCatalog";

describe("hubShare", () => {
  it("builds a multi-mode day summary", () => {
    const text = buildHubDayShareText(
      [
        { mode: "world", score: 18_000 },
        { mode: "daily", score: 3_300 },
      ],
      "2026-10-05",
    );
    assert.match(text, /PIN5 — 2026-10-05/);
    assert.match(text, /WORLD World\s+18,000 pts/);
    assert.match(text, /UK United Kingdom\s+3,300 pts/);
  });

  it("describes played and unplayed tiles for screen readers", () => {
    const world = HUB_GAMES[0]!;
    assert.match(
      hubTileAriaLabel(world, false, null),
      /not played yet/i,
    );
    assert.match(
      hubTileAriaLabel(world, true, 25_000),
      /played, 25,000 points/i,
    );
  });
});
