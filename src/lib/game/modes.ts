/**
 * PIN5 game modes.
 * Each mode is an independent daily game with its own session cookie and history.
 */

export const GAME_MODES = ["daily", "football"] as const;

export type GameMode = (typeof GAME_MODES)[number];

export const DEFAULT_GAME_MODE: GameMode = "daily";

/** Session cookie names — one per mode so both games can be in progress. */
export const SESSION_COOKIE_BY_MODE: Record<GameMode, string> = {
  daily: "fivegames_session",
  football: "fivegames_session_football",
};

/** localStorage keys for player history — one per mode. */
export const PLAYER_HISTORY_KEY_BY_MODE: Record<GameMode, string> = {
  daily: "pin5_player_history",
  football: "pin5_football_player_history",
};

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
    : `${path}${separator}mode=${mode}`;
}

export function modeDisplayName(mode: GameMode): string {
  return mode === "football" ? "Football" : "Daily";
}

export function modeShareTitle(mode: GameMode): string {
  return mode === "football" ? "PIN5 ⚽ FOOTBALL" : "PIN5";
}
