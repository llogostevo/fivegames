import { recordCollectionFromReveal } from "@/lib/game/collection";
import { addCalendarDays, isValidIsoDate } from "@/lib/game/date";
import {
  DEFAULT_GAME_MODE,
  PLAYER_HISTORY_KEY_BY_MODE,
  scoringProfileForMode,
  type GameMode,
} from "@/lib/game/modes";
import {
  maxScoreForProfile,
  SCORING,
} from "@/lib/game/scoring";
import { isThemeId, type ThemeId } from "@/lib/game/themes";
import { getWeekDates, getWeekdayIndex } from "@/lib/game/week";
import type { GameReveal } from "@/types/game";

/** Daily history key — kept for backwards compatibility with existing localStorage. */
export const PLAYER_HISTORY_KEY = PLAYER_HISTORY_KEY_BY_MODE.daily;
export const PLAYER_HISTORY_VERSION = 1;

/** @deprecated Prefer maxWeeklyScoreForMode(mode) */
export const MAX_WEEKLY_SCORE = SCORING.MAX_TOTAL_POINTS * 7;

export function maxWeeklyScoreForMode(
  mode: GameMode = DEFAULT_GAME_MODE,
): number {
  return maxScoreForProfile(scoringProfileForMode(mode)) * 7;
}

export function historyStorageKey(mode: GameMode = DEFAULT_GAME_MODE): string {
  return PLAYER_HISTORY_KEY_BY_MODE[mode];
}

export type PlayerHistoryGame = {
  gameId: string;
  gameNumber: number;
  date: string;
  theme: ThemeId;
  score: number;
  lockedAfterClue: number;
  completedAt: string;
  /** Optional — older history records omit these. */
  foundLocation?: boolean;
  foundOnPin?: number | null;
  /** Optional — metres from final pin to target. Older records omit this. */
  finalDistanceMeters?: number;
};

export type PlayerHistory = {
  version: typeof PLAYER_HISTORY_VERSION;
  games: Record<string, PlayerHistoryGame>;
};

export type WeekDayStatus = "completed" | "today" | "missed" | "future";

export type WeekDaySummary = {
  date: string;
  label: "M" | "T" | "W" | "T" | "F" | "S" | "S";
  weekdayIndex: number;
  status: WeekDayStatus;
  score: number | null;
  theme: ThemeId | null;
};

export type WeeklyStats = {
  weekDates: string[];
  weeklyScore: number;
  maxWeeklyScore: number;
  days: WeekDaySummary[];
};

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;

function emptyHistory(): PlayerHistory {
  return { version: PLAYER_HISTORY_VERSION, games: {} };
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function parseHistoryGame(
  value: unknown,
  key: string,
): PlayerHistoryGame | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Partial<PlayerHistoryGame>;
  const date =
    typeof record.date === "string" && isValidIsoDate(record.date)
      ? record.date
      : typeof record.gameId === "string" && isValidIsoDate(record.gameId)
        ? record.gameId
        : null;

  if (!date || date !== key) {
    return null;
  }

  if (typeof record.gameId !== "string" || record.gameId !== date) {
    return null;
  }

  if (
    typeof record.gameNumber !== "number" ||
    !Number.isInteger(record.gameNumber) ||
    record.gameNumber < 1
  ) {
    return null;
  }

  if (!isThemeId(record.theme)) {
    return null;
  }

  if (
    typeof record.score !== "number" ||
    !Number.isFinite(record.score) ||
    record.score < 0 ||
    record.score > SCORING.MAX_TOTAL_POINTS
  ) {
    return null;
  }

  if (
    typeof record.lockedAfterClue !== "number" ||
    !Number.isInteger(record.lockedAfterClue) ||
    record.lockedAfterClue < 1 ||
    record.lockedAfterClue > 5
  ) {
    return null;
  }

  if (!isIsoTimestamp(record.completedAt)) {
    return null;
  }

  const foundLocation = record.foundLocation === true;
  let foundOnPin: number | null | undefined;
  if (foundLocation) {
    if (
      typeof record.foundOnPin === "number" &&
      Number.isInteger(record.foundOnPin) &&
      record.foundOnPin >= 1 &&
      record.foundOnPin <= 5
    ) {
      foundOnPin = record.foundOnPin;
    } else {
      foundOnPin = null;
    }
  } else if (record.foundLocation === false) {
    foundOnPin = null;
  }

  const finalDistanceMeters =
    typeof record.finalDistanceMeters === "number" &&
    Number.isFinite(record.finalDistanceMeters) &&
    record.finalDistanceMeters >= 0
      ? Math.round(record.finalDistanceMeters)
      : undefined;

  return {
    gameId: record.gameId,
    gameNumber: record.gameNumber,
    date,
    theme: record.theme,
    score: Math.round(record.score),
    lockedAfterClue: record.lockedAfterClue,
    completedAt: record.completedAt,
    ...(record.foundLocation === true || record.foundLocation === false
      ? { foundLocation, foundOnPin: foundOnPin ?? null }
      : {}),
    ...(finalDistanceMeters !== undefined ? { finalDistanceMeters } : {}),
  };
}

/** Parse untrusted localStorage JSON into a validated history object. */
export function parsePlayerHistory(raw: unknown): PlayerHistory {
  if (!raw || typeof raw !== "object") {
    return emptyHistory();
  }

  const candidate = raw as { version?: unknown; games?: unknown };
  if (candidate.version !== PLAYER_HISTORY_VERSION) {
    return emptyHistory();
  }

  if (!candidate.games || typeof candidate.games !== "object") {
    return emptyHistory();
  }

  const games: Record<string, PlayerHistoryGame> = {};
  for (const [key, value] of Object.entries(
    candidate.games as Record<string, unknown>,
  )) {
    const parsed = parseHistoryGame(value, key);
    if (parsed) {
      games[parsed.date] = parsed;
    }
  }

  return { version: PLAYER_HISTORY_VERSION, games };
}

export function readPlayerHistory(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
  mode: GameMode = DEFAULT_GAME_MODE,
): PlayerHistory {
  if (!storage) {
    return emptyHistory();
  }

  try {
    const raw = storage.getItem(historyStorageKey(mode));
    if (!raw) {
      return emptyHistory();
    }
    return parsePlayerHistory(JSON.parse(raw) as unknown);
  } catch {
    return emptyHistory();
  }
}

export const PLAYER_HISTORY_UPDATED_EVENT = "pin5-history-updated";

export function writePlayerHistory(
  history: PlayerHistory,
  storage: Pick<Storage, "setItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
  mode: GameMode = DEFAULT_GAME_MODE,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(historyStorageKey(mode), JSON.stringify(history));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(PLAYER_HISTORY_UPDATED_EVENT, { detail: { mode } }),
      );
    }
  } catch {
    // Quota / private mode — ignore.
  }
}

export function historyGameFromReveal(
  reveal: GameReveal,
  completedAt: Date = new Date(),
): PlayerHistoryGame {
  return {
    gameId: reveal.gameId,
    gameNumber: reveal.gameNumber,
    date: reveal.date,
    theme: reveal.themeId,
    score: reveal.totalScore,
    lockedAfterClue: reveal.lockedAfterClue,
    completedAt: completedAt.toISOString(),
    foundLocation: reveal.foundLocation === true,
    foundOnPin: reveal.foundLocation ? (reveal.foundOnPin ?? null) : null,
    ...(typeof reveal.finalDistanceMeters === "number" &&
    Number.isFinite(reveal.finalDistanceMeters) &&
    reveal.finalDistanceMeters >= 0
      ? { finalDistanceMeters: Math.round(reveal.finalDistanceMeters) }
      : {}),
  };
}

/**
 * Idempotently record a server-authoritative completed game.
 * One date = one record (overwrite, never duplicate).
 */
export function upsertCompletedGame(
  history: PlayerHistory,
  game: PlayerHistoryGame,
): PlayerHistory {
  const parsed = parseHistoryGame(game, game.date);
  if (!parsed) {
    return history;
  }

  return {
    version: PLAYER_HISTORY_VERSION,
    games: {
      ...history.games,
      [parsed.date]: parsed,
    },
  };
}

/** Record completion from a server reveal into localStorage (idempotent). */
export function recordCompletedReveal(
  reveal: GameReveal,
  completedAt: Date = new Date(),
  storage: Pick<Storage, "getItem" | "setItem"> | null = typeof window !==
  "undefined"
    ? window.localStorage
    : null,
): PlayerHistory {
  const mode = reveal.mode ?? DEFAULT_GAME_MODE;
  const current = readPlayerHistory(storage, mode);
  const next = upsertCompletedGame(
    current,
    historyGameFromReveal(reveal, completedAt),
  );
  writePlayerHistory(next, storage, mode);
  // Found/Bagged collection — same storage, never throws into gameplay.
  recordCollectionFromReveal(reveal, storage);
  return next;
}

/**
 * Weekly Mon–Sun stats relative to `referenceDate` (usually the currently
 * released game date / today's completed game date).
 */
export function getWeeklyStats(
  history: PlayerHistory,
  referenceDate: string,
  mode: GameMode = DEFAULT_GAME_MODE,
): WeeklyStats {
  const weekDates = getWeekDates(referenceDate);
  let weeklyScore = 0;

  const days: WeekDaySummary[] = weekDates.map((date) => {
    const weekdayIndex = getWeekdayIndex(date);
    const record = history.games[date];
    if (record) {
      weeklyScore += record.score;
    }

    let status: WeekDayStatus;
    if (date > referenceDate) {
      status = "future";
    } else if (record) {
      status = "completed";
    } else if (date === referenceDate) {
      status = "today";
    } else {
      status = "missed";
    }

    return {
      date,
      label: DAY_LABELS[weekdayIndex]!,
      weekdayIndex,
      status,
      score: record?.score ?? null,
      theme: record?.theme ?? null,
    };
  });

  return {
    weekDates,
    weeklyScore,
    maxWeeklyScore: maxWeeklyScoreForMode(mode),
    days,
  };
}

/**
 * Consecutive calendar-day streak ending on the currently released game date
 * (if completed) or the previous calendar day (if not yet completed).
 *
 * Pass the currently released game date — not a naïve device date before 08:00 —
 * so an unreleased “tomorrow” is never treated as a miss.
 */
export function getCurrentStreak(
  history: PlayerHistory,
  availableGameDate: string,
): number {
  if (!isValidIsoDate(availableGameDate)) {
    return 0;
  }

  let cursor = history.games[availableGameDate]
    ? availableGameDate
    : addCalendarDays(availableGameDate, -1);

  let streak = 0;
  while (history.games[cursor]) {
    streak += 1;
    cursor = addCalendarDays(cursor, -1);
  }

  return streak;
}

export function formatStreakLabel(streak: number): string {
  const days = Math.max(0, Math.floor(streak));
  return `${days} day streak`;
}
