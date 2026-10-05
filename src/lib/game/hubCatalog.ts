/**
 * Hub landing catalog — display metadata for the game grid.
 * Playable modes still live in `modes.ts`; this layer is hub-only.
 */

import {
  GAME_MODE_DEFINITIONS,
  type GameMode,
} from "@/lib/game/modes";

export type HubGameGroup = "general" | "football";

export type HubGameEntry = {
  id: GameMode;
  group: HubGameGroup;
  /** Tile / featured title (e.g. World, England). */
  name: string;
  /** Small uppercase label under/above the name. */
  shortLabel: string;
  /** Badge code — no flag emoji. */
  code: string;
  /** Top-right tile emoji (⚽ / 📍 / 🍺). */
  tileEmoji: string;
  href: string;
  mapImage: string;
  /** Preferred featured candidate (World). */
  featured?: boolean;
  /** Section group label for aria. */
  groupLabel: string;
};

export type HubComingSoonEntry = {
  id: string;
  group: HubGameGroup;
  comingSoon: true;
  label: string;
};

export type HubCatalogEntry = HubGameEntry | HubComingSoonEntry;

export function isHubGameEntry(
  entry: HubCatalogEntry,
): entry is HubGameEntry {
  return !("comingSoon" in entry && entry.comingSoon);
}

/** Ordered catalog — World featured first, then UK, London pubs, then Football. */
export const HUB_GAMES: readonly HubGameEntry[] = [
  {
    id: "world",
    group: "general",
    name: "World",
    shortLabel: "Anywhere on Earth",
    code: "WORLD",
    tileEmoji: "📍",
    href: GAME_MODE_DEFINITIONS.world.path,
    mapImage: "/hub-maps/world.webp",
    featured: true,
    groupLabel: "Daily 5",
  },
  {
    id: "daily",
    group: "general",
    name: "United Kingdom",
    shortLabel: "Daily 5",
    code: "UK",
    tileEmoji: "📍",
    href: GAME_MODE_DEFINITIONS.daily.path,
    mapImage: "/hub-maps/uk.webp",
    groupLabel: "Daily 5",
  },
  {
    id: "london-pubs",
    group: "general",
    name: "London",
    shortLabel: "Pubs",
    code: "LDN",
    tileEmoji: "🍺",
    href: GAME_MODE_DEFINITIONS["london-pubs"].path,
    mapImage: "/hub-maps/london.webp",
    groupLabel: "Pubs 5",
  },
  {
    id: "london-stations",
    group: "general",
    name: "London",
    shortLabel: "Train & Tube",
    code: "TFL",
    tileEmoji: "🚇",
    href: GAME_MODE_DEFINITIONS["london-stations"].path,
    mapImage: "/hub-maps/london.webp",
    groupLabel: "Train & Tube",
  },
  {
    id: "football",
    group: "football",
    name: "England",
    shortLabel: "The 92",
    code: "ENG",
    tileEmoji: "⚽",
    href: GAME_MODE_DEFINITIONS.football.path,
    mapImage: "/hub-maps/england.webp",
    groupLabel: "Football 5",
  },
  {
    id: "football-italy",
    group: "football",
    name: "Italy",
    shortLabel: "Serie A & B",
    code: "ITA",
    tileEmoji: "⚽",
    href: GAME_MODE_DEFINITIONS["football-italy"].path,
    mapImage: "/hub-maps/italy.webp",
    groupLabel: "Football 5",
  },
  {
    id: "football-germany",
    group: "football",
    name: "Germany",
    shortLabel: "Bundesliga 1 & 2",
    code: "GER",
    tileEmoji: "⚽",
    href: GAME_MODE_DEFINITIONS["football-germany"].path,
    mapImage: "/hub-maps/germany.webp",
    groupLabel: "Football 5",
  },
  {
    id: "football-france",
    group: "football",
    name: "France",
    shortLabel: "Ligue 1 & 2",
    code: "FRA",
    tileEmoji: "⚽",
    href: GAME_MODE_DEFINITIONS["football-france"].path,
    mapImage: "/hub-maps/france.webp",
    groupLabel: "Football 5",
  },
  {
    id: "football-spain",
    group: "football",
    name: "Spain",
    shortLabel: "LaLiga & Segunda",
    code: "ESP",
    tileEmoji: "⚽",
    href: GAME_MODE_DEFINITIONS["football-spain"].path,
    mapImage: "/hub-maps/spain.webp",
    groupLabel: "Football 5",
  },
] as const;

export const HUB_COMING_SOON: readonly HubComingSoonEntry[] = [
  {
    id: "coming-general",
    group: "general",
    comingSoon: true,
    label: "More daily editions coming soon",
  },
  {
    id: "coming-football",
    group: "football",
    comingSoon: true,
    label: "More leagues coming soon",
  },
] as const;

export const HUB_SECTION_META: Record<
  HubGameGroup,
  { id: string; title: string }
> = {
  general: { id: "general-knowledge", title: "General knowledge" },
  football: { id: "football-5", title: "Football 5" },
};

export function hubGamesInGroup(group: HubGameGroup): HubGameEntry[] {
  return HUB_GAMES.filter((game) => game.group === group);
}

export function comingSoonForGroup(
  group: HubGameGroup,
): HubComingSoonEntry | null {
  return HUB_COMING_SOON.find((entry) => entry.group === group) ?? null;
}

/**
 * Featured game: first `featured` candidate still unplayed, else the next
 * unplayed game in catalog order. Null when everything is played.
 */
export function pickFeaturedGame(
  playedToday: ReadonlySet<GameMode> | ReadonlyMap<GameMode, boolean>,
): HubGameEntry | null {
  const isPlayed = (id: GameMode) => {
    if ("get" in playedToday) {
      return playedToday.get(id) === true;
    }
    return playedToday.has(id);
  };

  const preferred = HUB_GAMES.find((game) => game.featured && !isPlayed(game.id));
  if (preferred) {
    return preferred;
  }

  return HUB_GAMES.find((game) => !isPlayed(game.id)) ?? null;
}

/**
 * Pad a section's visible tiles with a coming-soon slot only on the
 * 2-column phone grid. Wider layouts leave gaps empty instead.
 */
export function withComingSoonPad(
  tiles: HubGameEntry[],
  columns: number,
  pad: HubComingSoonEntry | null,
): Array<HubGameEntry | HubComingSoonEntry> {
  if (!pad || tiles.length === 0 || columns !== 2) {
    return tiles;
  }
  const remainder = tiles.length % columns;
  if (remainder === 0) {
    return tiles;
  }
  return [...tiles, pad];
}
