import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * After `next build`, confirm production client chunks do not contain
 * DevDateToolbar answer spoilers or server-only game JSON coordinates.
 *
 * This test is skipped when `.next` has not been built yet.
 */
const ANSWER_SPOILERS = [
  "Liverpool",
  "Edinburgh",
  "Cardiff",
  "Manchester",
  "York",
  "Giant's Causeway",
  "Portmeirion",
] as const;

async function collectJsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectJsFiles(full)));
    } else if (entry.isFile() && /\.(js|css)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe("production client bundle hygiene", () => {
  it("does not ship DevDateToolbar answer names or game coordinates", async () => {
    const nextDir = path.join(process.cwd(), ".next");
    let staticDir: string;
    try {
      staticDir = path.join(nextDir, "static");
      await readdir(staticDir);
    } catch {
      // Build not present — skip rather than fail unit-only runs.
      return;
    }

    const files = await collectJsFiles(staticDir);
    assert.ok(files.length > 0, "expected production static assets");

    const hits: string[] = [];
    for (const file of files) {
      const text = await readFile(file, "utf8");
      for (const name of ANSWER_SPOILERS) {
        if (text.includes(name)) {
          hits.push(`${path.relative(process.cwd(), file)} contains ${name}`);
        }
      }
      // Sample coordinates from beta game JSON must not appear client-side.
      if (text.includes("53.4084") || text.includes("-2.9916")) {
        hits.push(
          `${path.relative(process.cwd(), file)} contains Liverpool coordinates`,
        );
      }
      // Toolbar labels previously embedded answer city names as "Music · Liverpool".
      if (text.includes("Music · Liverpool") || text.includes("World · Edinburgh")) {
        hits.push(
          `${path.relative(process.cwd(), file)} contains DevDateToolbar spoiler labels`,
        );
      }
    }

    assert.deepEqual(hits, []);
  });
});
