import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";
import {
  getAvailableGameDate,
  getNextReleaseAt,
  isGameDateReleased,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";
import { getTheme, isThemeId } from "@/lib/game/themes";
import type { GameDefinition } from "@/types/game";

export class GameNotFoundError extends Error {
  readonly date: string;

  constructor(date: string) {
    super(`No game for date ${date}`);
    this.name = "GameNotFoundError";
    this.date = date;
  }
}

export class InvalidGameDataError extends Error {
  readonly gameId: string;

  constructor(gameId: string, reason: string) {
    super(`Invalid game data (${gameId}): ${reason}`);
    this.name = "InvalidGameDataError";
    this.gameId = gameId;
  }
}

function gamesDirectory(): string {
  return path.join(process.cwd(), "data", "games");
}

function assertCoordinate(value: unknown, field: string, gameId: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidGameDataError(gameId, `${field} must be a finite number`);
  }
  return value;
}

/** Validate and normalise a parsed JSON game object. */
export function parseGameDefinition(
  value: unknown,
  expectedId?: string,
): GameDefinition {
  if (!value || typeof value !== "object") {
    throw new InvalidGameDataError(expectedId ?? "unknown", "expected an object");
  }

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : expectedId;

  if (!id || !isValidIsoDate(id)) {
    throw new InvalidGameDataError(
      id ?? "unknown",
      "id must be a valid ISO date (YYYY-MM-DD)",
    );
  }

  if (typeof raw.date !== "string" || !isValidIsoDate(raw.date)) {
    throw new InvalidGameDataError(id, "date must be a valid ISO date");
  }

  if (raw.date !== id) {
    throw new InvalidGameDataError(id, "date must match id");
  }

  if (expectedId && id !== expectedId) {
    throw new InvalidGameDataError(id, `id must match filename (${expectedId})`);
  }

  if (
    typeof raw.gameNumber !== "number" ||
    !Number.isInteger(raw.gameNumber) ||
    raw.gameNumber < 1
  ) {
    throw new InvalidGameDataError(id, "gameNumber must be a positive integer");
  }

  if (!isThemeId(raw.theme)) {
    throw new InvalidGameDataError(id, "theme is not a recognised theme id");
  }

  const answerRaw = raw.answer;
  if (!answerRaw || typeof answerRaw !== "object") {
    throw new InvalidGameDataError(id, "answer is required");
  }

  const answer = answerRaw as Record<string, unknown>;
  if (typeof answer.name !== "string" || answer.name.trim().length === 0) {
    throw new InvalidGameDataError(id, "answer.name must be a non-empty string");
  }

  const lat = assertCoordinate(answer.lat, "answer.lat", id);
  const lng = assertCoordinate(answer.lng, "answer.lng", id);

  if (lat < -90 || lat > 90) {
    throw new InvalidGameDataError(id, "answer.lat must be between -90 and 90");
  }
  if (lng < -180 || lng > 180) {
    throw new InvalidGameDataError(id, "answer.lng must be between -180 and 180");
  }

  if (!Array.isArray(raw.clues) || raw.clues.length !== CLUE_COUNT) {
    throw new InvalidGameDataError(
      id,
      `clues must contain exactly ${CLUE_COUNT} strings`,
    );
  }

  const clues = raw.clues.map((clue, index) => {
    if (typeof clue !== "string" || clue.trim().length === 0) {
      throw new InvalidGameDataError(
        id,
        `clues[${index}] must be a non-empty string`,
      );
    }
    return clue;
  });

  return {
    id,
    date: raw.date,
    gameNumber: raw.gameNumber,
    theme: raw.theme,
    answer: {
      name: answer.name.trim(),
      lat,
      lng,
    },
    clues,
  };
}

/** Load a game definition for an ISO date. Never import into client code. */
export async function getGameByDate(date: string): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new InvalidGameDataError(date, "date must be a valid ISO date");
  }

  const filePath = path.join(gamesDirectory(), `${date}.json`);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    throw new GameNotFoundError(date);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidGameDataError(date, "file is not valid JSON");
  }

  return parseGameDefinition(parsed, date);
}

/** @deprecated Prefer getGameByDate — kept as a thin alias for call-site clarity. */
export async function loadGame(gameId: string): Promise<GameDefinition> {
  return getGameByDate(gameId);
}

/**
 * Currently released daily game (Europe/London release schedule).
 * May override the clock via FIVEGAMES_DEV_NOW / FIVEGAMES_DEV_DATE (any environment).
 */
export async function getTodaysGame(
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getGameByDate(date);
}

/**
 * Load a game only if it is released at `now`.
 * Used to keep unreleased dated games out of the public start flow.
 */
export async function getReleasedGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getGameByDate(date);
}

/** Public theme/meta fields safe to send before completion. */
export function getPublicGameMeta(
  game: GameDefinition,
  now: Date = new Date(),
  options: ClockOptions = {},
) {
  const theme = getTheme(game.theme);
  return {
    gameId: game.id,
    gameNumber: game.gameNumber,
    date: game.date,
    themeId: game.theme,
    theme: theme.label,
    accent: theme.accent,
    accentSoft: theme.accentSoft,
    nextReleaseAt: getNextReleaseAt(now, options).toISOString(),
  };
}

/** Player-facing message when today's file is missing. */
export function missingGamePlayerMessage(): string {
  return "Today's FiveGames isn't available yet.";
}

/** Developer-facing detail for a missing dated game. */
export function missingGameDeveloperMessage(date: string): string {
  return `No game JSON for ${date}. Expected data/games/${date}.json. Set FIVEGAMES_DEV_DATE to a dated test game (see .env.example).`;
}
