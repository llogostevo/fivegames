import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

const SPOILERS = [
  "Liverpool",
  "Edinburgh",
  "Cardiff",
  "Manchester",
  "York",
] as const;

describe("DevDateToolbar source hygiene", () => {
  it("does not embed beta answer names in toolbar labels", async () => {
    const source = await readFile(
      path.join(process.cwd(), "src/components/dev/DevDateToolbar.tsx"),
      "utf8",
    );
    for (const name of SPOILERS) {
      assert.equal(
        source.includes(name),
        false,
        `DevDateToolbar must not contain answer name "${name}"`,
      );
    }
  });
});
