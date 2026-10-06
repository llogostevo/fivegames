import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCollectionModeShareText,
  buildCollectionShareLine,
} from "./share";
import type { CollectionCounts } from "./collection";

describe("collection share helpers", () => {
  const counts: CollectionCounts = { found: 41, bagged: 6, total: 92 };

  it("formats daily collection share lines", () => {
    assert.equal(
      buildCollectionShareLine("bagged", counts),
      "🎯 Bagged today! · 41 found · 6 bagged of 92",
    );
    assert.equal(
      buildCollectionShareLine("found", counts),
      "Found today! · 41 found · 6 bagged of 92",
    );
    assert.equal(
      buildCollectionShareLine("none", counts),
      "41 found · 6 bagged of 92",
    );
  });

  it("builds per-mode collection share without place names", () => {
    const text = buildCollectionModeShareText("football", counts);
    assert.ok(text.startsWith("My Pin5 Football collection: 41 found · 6 bagged of 92 🎯"));
    assert.ok(text.includes("football/england?ref=friend-share"));
    assert.ok(!text.toLowerCase().includes("wrexham"));
  });
});
