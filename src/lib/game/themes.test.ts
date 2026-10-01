import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  THEMES,
  THEME_IDS,
  getTheme,
  getThemeOrDefault,
  isThemeId,
} from "./themes";

describe("theme accents", () => {
  it("gives every recognised theme an accent and soft tint", () => {
    for (const id of THEME_IDS) {
      const theme = THEMES[id];
      assert.equal(theme.id, id);
      assert.ok(theme.accent.startsWith("#"));
      assert.ok(theme.accentSoft.startsWith("#"));
      assert.ok(theme.label.length > 0);
    }
  });

  it("selects the correct theme configuration", () => {
    assert.equal(getTheme("history").label, "History");
    assert.equal(getTheme("history").accent, "#b45309");
    assert.equal(getTheme("sport").accent, "#15803d");
  });

  it("handles unknown themes safely", () => {
    assert.equal(isThemeId("jazz"), false);
    assert.equal(getThemeOrDefault("jazz").id, "music");
    assert.equal(getThemeOrDefault(null).id, "music");
  });
});
