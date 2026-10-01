import { createRequire } from "node:module";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * MapLibre GL JS v6 needs its worker and shared modules served as static
 * files when bundled with Next.js/Turbopack. See:
 * https://maplibre.org/maplibre-gl-js/docs/
 */

const WANTED = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../package.json"));
const packageJsonPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const srcDir = join(dirname(packageJsonPath), "dist");
const root = resolve(here, "../public/maplibre");
const dest = join(root, version);

try {
  if (existsSync(root)) {
    for (const entry of readdirSync(root)) {
      if (entry !== version) {
        rmSync(join(root, entry), { recursive: true, force: true });
      }
    }
  }

  mkdirSync(dest, { recursive: true });

  for (const file of WANTED) {
    const src = join(srcDir, file);
    if (!existsSync(src)) {
      throw new Error(`missing from maplibre-gl package: dist/${file}`);
    }
    cpSync(src, join(dest, file));
  }

  console.log(`[copy-maplibre-worker] ready at public/maplibre/${version}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[copy-maplibre-worker] failed: ${message}`);
  process.exit(1);
}
