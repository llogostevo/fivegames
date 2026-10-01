import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";
import type { GameDefinition } from "@/types/game";

function gamesDirectory(): string {
  return path.join(process.cwd(), "data", "games");
}

function isGameDefinition(value: unknown): value is GameDefinition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const game = value as GameDefinition;

  return (
    typeof game.id === "string" &&
    typeof game.theme === "string" &&
    Array.isArray(game.clues) &&
    game.clues.length === CLUE_COUNT &&
    game.clues.every((clue) => typeof clue === "string") &&
    typeof game.answer?.name === "string" &&
    typeof game.answer?.lat === "number" &&
    typeof game.answer?.lng === "number"
  );
}

/** Load a game definition from server-side JSON. Never import into client code. */
export async function loadGame(gameId: string): Promise<GameDefinition> {
  if (!/^[a-z0-9-]+$/i.test(gameId)) {
    throw new Error("Invalid game id");
  }

  const filePath = path.join(gamesDirectory(), `${gameId}.json`);

  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    throw new Error(`Game not found: ${gameId}`);
  }

  const parsed: unknown = JSON.parse(raw);

  if (!isGameDefinition(parsed) || parsed.id !== gameId) {
    throw new Error(`Invalid game data: ${gameId}`);
  }

  return parsed;
}
