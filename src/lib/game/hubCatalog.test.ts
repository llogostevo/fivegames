import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  HUB_GAMES,
  comingSoonForGroup,
  pickFeaturedGame,
  withComingSoonPad,
} from "./hubCatalog";

describe("hubCatalog", () => {
  it("lists World first and marks it featured", () => {
    assert.equal(HUB_GAMES[0]?.id, "world");
    assert.equal(HUB_GAMES[0]?.featured, true);
    assert.equal(HUB_GAMES[1]?.id, "daily");
  });

  it("features World when nothing is played", () => {
    const featured = pickFeaturedGame(new Set());
    assert.equal(featured?.id, "world");
  });

  it("features the next unplayed game after World is done", () => {
    const featured = pickFeaturedGame(new Set(["world"]));
    assert.equal(featured?.id, "daily");
  });

  it("returns null when every game is played", () => {
    const all = new Set(HUB_GAMES.map((game) => game.id));
    assert.equal(pickFeaturedGame(all), null);
  });

  it("pads an odd tile count with coming soon", () => {
    const pad = comingSoonForGroup("general");
    const tiles = HUB_GAMES.filter((game) => game.id === "daily");
    const padded = withComingSoonPad(tiles, 2, pad);
    assert.equal(padded.length, 2);
    assert.equal(padded[1] && "comingSoon" in padded[1], true);
  });

  it("does not pad a full row", () => {
    const football = HUB_GAMES.filter((game) => game.group === "football");
    // 5 football - 0 featured = 5 → pad to 6 at 2 cols
    const padded = withComingSoonPad(
      football,
      2,
      comingSoonForGroup("football"),
    );
    assert.equal(padded.length, 6);
  });

  it("does not pad on desktop column counts", () => {
    const tiles = HUB_GAMES.filter((game) => game.id === "daily");
    const padded = withComingSoonPad(
      tiles,
      4,
      comingSoonForGroup("general"),
    );
    assert.equal(padded.length, 1);
  });

  it("lists London pubs in the general section", () => {
    const general = HUB_GAMES.filter((game) => game.group === "general");
    assert.ok(general.some((game) => game.id === "london-pubs"));
    const pubs = HUB_GAMES.find((game) => game.id === "london-pubs");
    assert.equal(pubs?.tileEmoji, "🍺");
    assert.equal(pubs?.code, "LDN");
  });

  it("lists London train and tube in the general section", () => {
    const stations = HUB_GAMES.find((game) => game.id === "london-stations");
    assert.ok(stations);
    assert.equal(stations.tileEmoji, "🚇");
    assert.equal(stations.code, "TFL");
    assert.equal(stations.shortLabel, "Train & Tube");
  });
});
