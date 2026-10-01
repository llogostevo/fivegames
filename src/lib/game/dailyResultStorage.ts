import type { GameReveal } from "@/types/game";

const STORAGE_KEY = "pin5_daily_results";

type StoredResults = Record<string, GameReveal>;

function readAll(): StoredResults {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as StoredResults;
  } catch {
    return {};
  }
}

function writeAll(results: StoredResults) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  } catch {
    // Quota / private mode — ignore; welcome flow still works without persistence.
  }
}

/** Load a completed result for a given daily game id (ISO date). */
export function getDailyResult(gameId: string): GameReveal | null {
  const stored = readAll()[gameId];
  if (!stored || stored.complete !== true) {
    return null;
  }
  return stored;
}

/** Persist today's completed reveal for return visits. */
export function saveDailyResult(reveal: GameReveal) {
  const all = readAll();
  all[reveal.gameId] = reveal;

  // Keep a short window so localStorage stays small.
  const ids = Object.keys(all).sort();
  while (ids.length > 21) {
    const oldest = ids.shift();
    if (oldest) {
      delete all[oldest];
    }
  }

  writeAll(all);
}
