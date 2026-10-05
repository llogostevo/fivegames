/**
 * Deterministic Football schedule helpers (shared by all leagues).
 */

import { addCalendarDays, isValidIsoDate } from "@/lib/game/date";
import {
  FOOTBALL_LEAGUES,
  FOOTBALL_SCHEDULE,
  type FootballLeagueId,
} from "@/lib/game/football/leagues";

export { FOOTBALL_SCHEDULE };

/** FNV-1a style hash → uint32 seed for the PRNG. */
export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Mulberry32 PRNG — deterministic across runtimes. */
export function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher–Yates shuffle.
 * Clubs are first sorted by id so the base order is independent of JSON array order.
 */
export function orderFootballClubIds(
  clubIds: readonly string[],
  seed: string = FOOTBALL_SCHEDULE.seed,
): string[] {
  const ordered = [...clubIds].sort((a, b) => a.localeCompare(b));
  const random = createSeededRandom(seed);

  for (let index = ordered.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    const current = ordered[index]!;
    ordered[index] = ordered[swapWith]!;
    ordered[swapWith] = current;
  }

  return ordered;
}

/** Whole calendar days from startDate to date (date >= startDate). */
export function calendarDaysSince(startDate: string, date: string): number {
  if (!isValidIsoDate(startDate) || !isValidIsoDate(date)) {
    throw new Error("Invalid ISO date for football schedule");
  }
  if (date < startDate) {
    throw new Error(
      `Football date ${date} is before schedule start ${startDate}`,
    );
  }

  let cursor = startDate;
  let days = 0;
  while (cursor < date) {
    cursor = addCalendarDays(cursor, 1);
    days += 1;
  }
  return days;
}

export function footballCycleIndex(
  date: string,
  options: {
    cycleStartDate?: string;
    clubCount?: number;
  } = {},
): number {
  const cycleStartDate =
    options.cycleStartDate ?? FOOTBALL_SCHEDULE.cycleStartDate;
  const clubCount = options.clubCount ?? FOOTBALL_SCHEDULE.clubCount;
  const offset = calendarDaysSince(cycleStartDate, date);
  return ((offset % clubCount) + clubCount) % clubCount;
}

export function footballGameNumber(
  date: string,
  leagueId: FootballLeagueId = "england",
): number {
  const start = FOOTBALL_LEAGUES[leagueId].schedule.cycleStartDate;
  return calendarDaysSince(start, date) + 1;
}
