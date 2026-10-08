import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { GAME_MODES } from "@/lib/game/modes";

import {
  HUB_SEO,
  HUB_SOCIAL,
  INDEXABLE_PATHS,
  MODE_SEO,
  buildPageMetadata,
  gameJsonLd,
  socialDescriptionFor,
  socialTitleFor,
} from "./seo";

function openGraphFile(routePath: string): string {
  const segments = routePath === "/" ? [] : routePath.split("/").filter(Boolean);
  return path.join(process.cwd(), "src", "app", ...segments, "opengraph-image.tsx");
}

describe("homepage SEO", () => {
  it("keeps search copy separate from the social preview", () => {
    assert.equal(HUB_SEO.title, "PIN5 — Free Daily Geography & Map Games");
    assert.equal(
      HUB_SEO.description,
      "Play free daily map games with five clues and five guesses. Explore world geography, London, football stadiums, famous places and more. New puzzles every day.",
    );
    assert.equal(HUB_SEO.heading, "Free Daily Geography & Map Games");
    assert.match(HUB_SEO.intro, /^Love geography, maps or a good daily puzzle\?/);
    assert.equal(socialTitleFor(HUB_SEO), HUB_SOCIAL.title);
    assert.equal(socialDescriptionFor(HUB_SEO), HUB_SOCIAL.description);
    assert.notEqual(HUB_SEO.title, HUB_SOCIAL.title);

    const metadata = buildPageMetadata(HUB_SEO);
    assert.equal(metadata.title, HUB_SEO.title);
    assert.equal(metadata.description, HUB_SEO.description);
    assert.equal(metadata.openGraph?.title, HUB_SOCIAL.title);
    assert.equal(metadata.twitter?.title, HUB_SOCIAL.title);
    assert.equal(metadata.alternates?.canonical, "/");
  });
});

describe("game page SEO", () => {
  it("gives every mode a unique search title, visible copy and a specific FAQ", () => {
    const titles = new Set<string>();
    for (const mode of GAME_MODES) {
      const page = MODE_SEO[mode];
      assert.ok(page.title.includes("PIN5"), mode);
      assert.ok(page.description.length > 40, mode);
      assert.ok(page.heading.length > 0, mode);
      assert.ok(page.intro.length > 40, mode);
      assert.ok(page.faqs.length >= 4, mode);
      assert.equal(titles.has(page.title), false, page.title);
      titles.add(page.title);
      const metadata = buildPageMetadata(page);
      assert.equal(metadata.alternates?.canonical, page.path);
      assert.equal(metadata.openGraph?.title, page.title);
      const schema = gameJsonLd(page) as { "@type": string };
      assert.equal(schema["@type"], "Game");
    }
  });

  it("has a branded Open Graph image for every indexable path", () => {
    for (const routePath of INDEXABLE_PATHS) {
      assert.equal(existsSync(openGraphFile(routePath)), true, routePath);
    }
    assert.equal(INDEXABLE_PATHS.includes("/collection"), false);
  });
});
