/**
 * PIN5 game mode registry.
 * Each mode is an independent daily game: own path, cookie, history, share URL.
 *
 * `football` = England Football 92 (/football/england)
 * `football-italy` = Italy (/football/italy)
 * `football-germany` = Germany (/football/germany)
 * `football-france` = France (/football/france)
 * `football-spain` = Spain (/football/spain)
 * `world` = World places (/world)
 */

import {
  DEFAULT_MAP_START,
  WORLD_MAP_START,
  type MapStartView,
} from "@/lib/map/provider";
import {
  COUNTRY_SCORING_PROFILE,
  WORLD_SCORING_PROFILE,
  type ScoringProfile,
} from "@/lib/game/scoring";

export const GAME_MODES = [
  "world",
  "daily",
  "football",
  "football-italy",
  "football-germany",
  "football-france",
  "football-spain",
] as const;

export type GameMode = (typeof GAME_MODES)[number];

export const DEFAULT_GAME_MODE: GameMode = "daily";

export type GameModeDefinition = {
  id: GameMode;
  /** Canonical play URL. */
  path: string;
  /** Hub card / menu title. */
  title: string;
  /** Edition / country line. */
  subtitle: string;
  /** Compact header chip. */
  chipLabel: string;
  emoji: string;
  detail: string;
  sessionCookie: string;
  historyKey: string;
  /** Path appended to beta origin for share text. */
  sharePath: string;
  /** Share headline prefix (without game number). */
  shareTitle: string;
  /** Results / OG mode label. */
  modeLabel: string;
  family: "daily" | "football" | "world";
  /**
   * Fixed opening map camera for this mode.
   * Country/region overview only — must not encode the day’s answer.
   */
  mapStart: MapStartView;
  /** Distance → points curve for this mode. */
  scoring: ScoringProfile;
};

export const GAME_MODE_DEFINITIONS: Record<GameMode, GameModeDefinition> = {
  daily: {
    id: "daily",
    path: "/daily",
    title: "Daily 5",
    subtitle: "UK Edition",
    chipLabel: "UK Edition",
    emoji: "🇬🇧",
    detail: "Five clues to find today’s UK place.",
    sessionCookie: "fivegames_session",
    historyKey: "pin5_player_history",
    sharePath: "/daily",
    shareTitle: "PIN5",
    modeLabel: "DAILY 5",
    family: "daily",
    mapStart: DEFAULT_MAP_START,
    scoring: COUNTRY_SCORING_PROFILE,
  },
  world: {
    id: "world",
    path: "/world",
    title: "Daily 5",
    subtitle: "World",
    chipLabel: "World",
    emoji: "🌍",
    detail: "Five clues to find today’s place anywhere on Earth.",
    sessionCookie: "fivegames_session_world",
    historyKey: "pin5_world_player_history",
    sharePath: "/world",
    shareTitle: "PIN5 🌍 WORLD",
    modeLabel: "WORLD",
    family: "world",
    mapStart: WORLD_MAP_START,
    scoring: WORLD_SCORING_PROFILE,
  },
  football: {
    id: "football",
    path: "/football/england",
    title: "Football 5",
    subtitle: "England",
    chipLabel: "Football · England",
    emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    detail: "Five clues to find today’s Football 92 home ground.",
    // Keep existing cookie/history keys so in-progress England games survive.
    sessionCookie: "fivegames_session_football",
    historyKey: "pin5_football_player_history",
    sharePath: "/football/england",
    shareTitle: "PIN5 ⚽ FOOTBALL · ENGLAND",
    modeLabel: "FOOTBALL · ENGLAND",
    family: "football",
    mapStart: {
      center: { lat: 52.8, lng: -1.5 },
      zoom: 5.8,
    },
    scoring: COUNTRY_SCORING_PROFILE,
  },
  "football-italy": {
    id: "football-italy",
    path: "/football/italy",
    title: "Football 5",
    subtitle: "Italy",
    chipLabel: "Football · Italy",
    emoji: "🇮🇹",
    detail: "Five clues to find today’s Italian football home ground.",
    sessionCookie: "fivegames_session_football_italy",
    historyKey: "pin5_football_italy_player_history",
    sharePath: "/football/italy",
    shareTitle: "PIN5 ⚽ FOOTBALL · ITALY",
    modeLabel: "FOOTBALL · ITALY",
    family: "football",
    mapStart: {
      center: { lat: 42.0, lng: 12.5 },
      zoom: 5.4,
    },
    scoring: COUNTRY_SCORING_PROFILE,
  },
  "football-germany": {
    id: "football-germany",
    path: "/football/germany",
    title: "Football 5",
    subtitle: "Germany",
    chipLabel: "Football · Germany",
    emoji: "🇩🇪",
    detail: "Five clues to find today’s Bundesliga / 2. Bundesliga home ground.",
    sessionCookie: "fivegames_session_football_germany",
    historyKey: "pin5_football_germany_player_history",
    sharePath: "/football/germany",
    shareTitle: "PIN5 ⚽ FOOTBALL · GERMANY",
    modeLabel: "FOOTBALL · GERMANY",
    family: "football",
    mapStart: {
      center: { lat: 51.2, lng: 10.4 },
      zoom: 5.7,
    },
    scoring: COUNTRY_SCORING_PROFILE,
  },
  "football-france": {
    id: "football-france",
    path: "/football/france",
    title: "Football 5",
    subtitle: "France",
    chipLabel: "Football · France",
    emoji: "🇫🇷",
    detail: "Five clues to find today’s Ligue 1 / Ligue 2 home ground.",
    sessionCookie: "fivegames_session_football_france",
    historyKey: "pin5_football_france_player_history",
    sharePath: "/football/france",
    shareTitle: "PIN5 ⚽ FOOTBALL · FRANCE",
    modeLabel: "FOOTBALL · FRANCE",
    family: "football",
    mapStart: {
      center: { lat: 46.6, lng: 2.2 },
      zoom: 5.4,
    },
    scoring: COUNTRY_SCORING_PROFILE,
  },
  "football-spain": {
    id: "football-spain",
    path: "/football/spain",
    title: "Football 5",
    subtitle: "Spain",
    chipLabel: "Football · Spain",
    emoji: "🇪🇸",
    detail: "Five clues to find today’s LaLiga / Segunda División home ground.",
    sessionCookie: "fivegames_session_football_spain",
    historyKey: "pin5_football_spain_player_history",
    sharePath: "/football/spain",
    shareTitle: "PIN5 ⚽ FOOTBALL · SPAIN",
    modeLabel: "FOOTBALL · SPAIN",
    family: "football",
    mapStart: {
      center: { lat: 39.8, lng: -3.5 },
      zoom: 5.4,
    },
    scoring: COUNTRY_SCORING_PROFILE,
  },
};

/** Session cookie names — one per mode so games can be in progress together. */
export const SESSION_COOKIE_BY_MODE: Record<GameMode, string> = {
  daily: GAME_MODE_DEFINITIONS.daily.sessionCookie,
  world: GAME_MODE_DEFINITIONS.world.sessionCookie,
  football: GAME_MODE_DEFINITIONS.football.sessionCookie,
  "football-italy": GAME_MODE_DEFINITIONS["football-italy"].sessionCookie,
  "football-germany":
    GAME_MODE_DEFINITIONS["football-germany"].sessionCookie,
  "football-france": GAME_MODE_DEFINITIONS["football-france"].sessionCookie,
  "football-spain": GAME_MODE_DEFINITIONS["football-spain"].sessionCookie,
};

/** localStorage keys for player history — one per mode. */
export const PLAYER_HISTORY_KEY_BY_MODE: Record<GameMode, string> = {
  daily: GAME_MODE_DEFINITIONS.daily.historyKey,
  world: GAME_MODE_DEFINITIONS.world.historyKey,
  football: GAME_MODE_DEFINITIONS.football.historyKey,
  "football-italy": GAME_MODE_DEFINITIONS["football-italy"].historyKey,
  "football-germany":
    GAME_MODE_DEFINITIONS["football-germany"].historyKey,
  "football-france": GAME_MODE_DEFINITIONS["football-france"].historyKey,
  "football-spain": GAME_MODE_DEFINITIONS["football-spain"].historyKey,
};

/** Future football leagues shown on hubs before they ship. */
export type UpcomingFootballLeague = {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
};

export const UPCOMING_FOOTBALL_LEAGUES: readonly UpcomingFootballLeague[] = [];

export function getModeDefinition(mode: GameMode): GameModeDefinition {
  return GAME_MODE_DEFINITIONS[mode];
}

export function scoringProfileForMode(mode: GameMode): ScoringProfile {
  return getModeDefinition(mode).scoring;
}

export function isGameMode(value: unknown): value is GameMode {
  return (
    typeof value === "string" &&
    (GAME_MODES as readonly string[]).includes(value)
  );
}

export function parseGameMode(value: unknown): GameMode {
  return isGameMode(value) ? value : DEFAULT_GAME_MODE;
}

export function getModeFromRequestUrl(url: string | URL): GameMode {
  const parsed = typeof url === "string" ? new URL(url) : url;
  return parseGameMode(parsed.searchParams.get("mode"));
}

export function modeApiPath(path: string, mode: GameMode): string {
  const separator = path.includes("?") ? "&" : "?";
  return mode === DEFAULT_GAME_MODE
    ? path
    : `${path}${separator}mode=${encodeURIComponent(mode)}`;
}

export function modeDisplayName(mode: GameMode): string {
  const def = getModeDefinition(mode);
  return def.family === "football" || def.family === "world"
    ? `${def.title} · ${def.subtitle}`
    : def.title;
}

export function modeShareTitle(mode: GameMode): string {
  return getModeDefinition(mode).shareTitle;
}

export function modePath(mode: GameMode): string {
  return getModeDefinition(mode).path;
}

export function isFootballMode(mode: GameMode): boolean {
  return getModeDefinition(mode).family === "football";
}

export function isWorldMode(mode: GameMode): boolean {
  return getModeDefinition(mode).family === "world";
}

/** Modes listed on the landing hub and results cross-sell. */
export function listPlayableModes(): GameModeDefinition[] {
  return GAME_MODES.map((id) => GAME_MODE_DEFINITIONS[id]);
}

export function listFootballModes(): GameModeDefinition[] {
  return listPlayableModes().filter((mode) => mode.family === "football");
}

/** Daily UK + World (non-football) hub section — World first. */
export function listGeneralKnowledgeModes(): GameModeDefinition[] {
  return [
    GAME_MODE_DEFINITIONS.world,
    GAME_MODE_DEFINITIONS.daily,
  ];
}
