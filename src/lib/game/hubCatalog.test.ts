import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  HUB_GAMES,
  HUB_SECTION_META,
  HUB_SECTION_ORDER,
  comingSoonForGroup,
  hubGamesInGroup,
  pickFeaturedGame,
  withComingSoonPad,
} from "./hubCatalog";

describe("hubCatalog", () => {
  it("lists World first and marks it featured", () => {
    assert.equal(HUB_GAMES[0]?.id, "world");
    assert.equal(HUB_GAMES[0]?.featured, true);
    assert.equal(HUB_GAMES[0]?.group, "places");
    assert.equal(HUB_GAMES[1]?.id, "world-airports");
    assert.equal(HUB_GAMES[2]?.id, "daily");
  });

  it("features World when nothing is played", () => {
    const featured = pickFeaturedGame(new Set());
    assert.equal(featured?.id, "world");
  });

  it("features the next unplayed game after World is done", () => {
    const featured = pickFeaturedGame(new Set(["world"]));
    assert.equal(featured?.id, "world-airports");
  });

  it("returns null when every game is played", () => {
    const all = new Set(HUB_GAMES.map((game) => game.id));
    assert.equal(pickFeaturedGame(all), null);
  });

  it("pads an odd tile count with coming soon", () => {
    const pad = comingSoonForGroup("places");
    const tiles = HUB_GAMES.filter((game) => game.id === "daily");
    const padded = withComingSoonPad(tiles, 2, pad);
    assert.equal(padded.length, 2);
    assert.equal(padded[1] && "comingSoon" in padded[1], true);
  });

  it("does not pad a full row", () => {
    const football = hubGamesInGroup("football");
    // 5 football → pad to 6 at 2 cols
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
      comingSoonForGroup("places"),
    );
    assert.equal(padded.length, 1);
  });

  it("groups Places, London, Music, Film and Football separately", () => {
    assert.deepEqual([...HUB_SECTION_ORDER], [
      "places",
      "london",
      "music",
      "film",
      "football",
    ]);
    assert.equal(HUB_SECTION_META.places.title, "Places");
    assert.equal(HUB_SECTION_META.london.title, "London");
    assert.equal(HUB_SECTION_META.music.title, "Music");
    assert.equal(HUB_SECTION_META.film.title, "Film & TV");
    assert.equal(HUB_SECTION_META.football.title, "Football 5");

    const places = hubGamesInGroup("places").map((game) => game.id);
    assert.deepEqual(places, ["world", "world-airports", "daily"]);

    const london = hubGamesInGroup("london");
    assert.equal(london.length, 2);
    assert.ok(london.some((game) => game.id === "london-pubs"));
    assert.ok(london.some((game) => game.id === "london-stations"));
    assert.equal(
      london.find((game) => game.id === "london-pubs")?.tileEmoji,
      "🍺",
    );
    assert.equal(
      london.find((game) => game.id === "london-stations")?.tileEmoji,
      "🚇",
    );

    const music = hubGamesInGroup("music");
    assert.equal(music.length, 1);
    assert.equal(music[0]?.id, "taylor-swift");
    assert.equal(music[0]?.tileEmoji, "🎤");
    assert.equal(music[0]?.code, "TS");

    const film = hubGamesInGroup("film");
    assert.equal(film.length, 3);
    assert.equal(film[0]?.id, "harry-potter");
    assert.equal(film[0]?.tileEmoji, "⚡");
    assert.equal(film[0]?.code, "HP");
    assert.equal(film[1]?.id, "marvel");
    assert.equal(film[1]?.tileEmoji, "🦸");
    assert.equal(film[1]?.code, "MV");
    assert.equal(film[2]?.id, "star-wars");
    assert.equal(film[2]?.tileEmoji, "⚔️");
    assert.equal(film[2]?.code, "SW");
  });

  it("lists London pubs under London with Pubs as the tile name", () => {
    const pubs = HUB_GAMES.find((game) => game.id === "london-pubs");
    assert.equal(pubs?.group, "london");
    assert.equal(pubs?.name, "Pubs");
    assert.equal(pubs?.shortLabel, "London");
  });

  it("lists London train and tube under London", () => {
    const stations = HUB_GAMES.find((game) => game.id === "london-stations");
    assert.ok(stations);
    assert.equal(stations.group, "london");
    assert.equal(stations.name, "Train & Tube");
    assert.equal(stations.shortLabel, "London");
    assert.equal(stations.code, "TFL");
  });

  it("lists World airports under Places", () => {
    const airports = HUB_GAMES.find((game) => game.id === "world-airports");
    assert.ok(airports);
    assert.equal(airports.group, "places");
    assert.equal(airports.tileEmoji, "✈️");
    assert.equal(airports.code, "APT");
    assert.equal(airports.name, "Airports");
  });

  it("lists Taylor Swift under Music", () => {
    const taylor = HUB_GAMES.find((game) => game.id === "taylor-swift");
    assert.ok(taylor);
    assert.equal(taylor.group, "music");
    assert.equal(taylor.tileEmoji, "🎤");
    assert.equal(taylor.code, "TS");
    assert.equal(taylor.shortLabel, "Career places");
  });

  it("lists Harry Potter under Film & TV", () => {
    const potter = HUB_GAMES.find((game) => game.id === "harry-potter");
    assert.ok(potter);
    assert.equal(potter.group, "film");
    assert.equal(potter.tileEmoji, "⚡");
    assert.equal(potter.code, "HP");
    assert.equal(potter.shortLabel, "Wizarding World");
  });

  it("lists Marvel under Film & TV", () => {
    const marvel = HUB_GAMES.find((game) => game.id === "marvel");
    assert.ok(marvel);
    assert.equal(marvel.group, "film");
    assert.equal(marvel.tileEmoji, "🦸");
    assert.equal(marvel.code, "MV");
    assert.equal(marvel.shortLabel, "MCU & comics");
  });

  it("lists Star Wars under Film & TV", () => {
    const starWars = HUB_GAMES.find((game) => game.id === "star-wars");
    assert.ok(starWars);
    assert.equal(starWars.group, "film");
    assert.equal(starWars.tileEmoji, "⚔️");
    assert.equal(starWars.code, "SW");
    assert.equal(starWars.shortLabel, "A galaxy far away");
  });
});
