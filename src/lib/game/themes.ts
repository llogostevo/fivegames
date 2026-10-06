/**
 * Weekly Pin5 theme schedule + accent colours.
 * Game JSON only stores the theme id; colours come from here.
 */

export const THEME_IDS = [
  "music",
  "movies-tv",
  "sport",
  "history",
  "landmarks",
  "culture",
  "wildcard",
  "football",
  "world",
  "london-pubs",
  "london-stations",
  "world-airports",
  "taylor-swift",
  "harry-potter",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeDefinition = {
  id: ThemeId;
  /** Full name for headings and results. */
  displayName: string;
  /** Compact UI chip / badge label. */
  label: string;
  /** Primary accent (maps to --course). */
  accent: string;
  /** Soft tint for chips / soft fills (maps to --course-soft). */
  accentSoft: string;
  /** Optional emoji for future UI. */
  emoji?: string;
};

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  music: {
    id: "music",
    displayName: "Music",
    label: "Music",
    accent: "#c4157a",
    accentSoft: "#fbe7f2",
    emoji: "🎵",
  },
  "movies-tv": {
    id: "movies-tv",
    displayName: "Movies & TV",
    label: "Movies & TV",
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
    emoji: "🎬",
  },
  sport: {
    id: "sport",
    displayName: "Sport",
    label: "Sport",
    accent: "#15803d",
    accentSoft: "#dcfce7",
    emoji: "⚽",
  },
  history: {
    id: "history",
    displayName: "History",
    label: "History",
    accent: "#b45309",
    accentSoft: "#fef3c7",
    emoji: "🏛️",
  },
  landmarks: {
    id: "landmarks",
    displayName: "Landmarks",
    label: "Landmarks",
    accent: "#1d4ed8",
    accentSoft: "#dbeafe",
    emoji: "🗺️",
  },
  culture: {
    id: "culture",
    displayName: "Culture",
    label: "Culture",
    accent: "#e11d48",
    accentSoft: "#ffe4e6",
    emoji: "🎭",
  },
  wildcard: {
    id: "wildcard",
    displayName: "Wildcard",
    label: "Wildcard",
    accent: "#0f766e",
    accentSoft: "#ccfbf1",
    emoji: "✨",
  },
  football: {
    id: "football",
    displayName: "Football",
    label: "Football",
    accent: "#15803d",
    accentSoft: "#dcfce7",
    emoji: "⚽",
  },
  world: {
    id: "world",
    displayName: "World",
    label: "World",
    accent: "#1d4ed8",
    accentSoft: "#dbeafe",
    emoji: "🌍",
  },
  "london-pubs": {
    id: "london-pubs",
    displayName: "London Pubs",
    label: "London Pubs",
    accent: "#b45309",
    accentSoft: "#fef3c7",
    emoji: "🍺",
  },
  "london-stations": {
    id: "london-stations",
    displayName: "Train & Tube",
    label: "Train & Tube",
    accent: "#e11d48",
    accentSoft: "#ffe4e6",
    emoji: "🚇",
  },
  "world-airports": {
    id: "world-airports",
    displayName: "Airports",
    label: "Airports",
    accent: "#0369a1",
    accentSoft: "#e0f2fe",
    emoji: "✈️",
  },
  "taylor-swift": {
    id: "taylor-swift",
    displayName: "Taylor Swift",
    label: "Taylor Swift",
    accent: "#c4157a",
    accentSoft: "#fbe7f2",
    emoji: "🎤",
  },
  "harry-potter": {
    id: "harry-potter",
    displayName: "Harry Potter",
    label: "Harry Potter",
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
    emoji: "⚡",
  },
};

/** JS getUTCDay()-style: 0 = Sunday … 6 = Saturday → theme for that weekday. */
export const WEEKDAY_THEMES: Record<number, ThemeId> = {
  1: "music",
  2: "movies-tv",
  3: "sport",
  4: "history",
  5: "landmarks",
  6: "culture",
  0: "wildcard",
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value as ThemeId);
}

export function getTheme(themeId: ThemeId): ThemeDefinition {
  return THEMES[themeId];
}

/** Safe lookup when an id might be missing or unknown. */
export function getThemeOrDefault(themeId: string | null | undefined): ThemeDefinition {
  if (themeId && isThemeId(themeId)) {
    return THEMES[themeId];
  }
  return THEMES.music;
}
