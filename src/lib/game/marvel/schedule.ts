/**
 * Deterministic Marvel schedule — one place per released day, cycling the pool.
 */

import { isValidIsoDate } from "@/lib/game/date";
import {
  calendarDaysSince,
  orderFootballClubIds,
} from "@/lib/game/football/schedule";
import { MARVEL_COUNT } from "@/lib/game/marvel/dataset";

export const MARVEL_SCHEDULE = {
  version: 1,
  cycleStartDate: "2026-10-06",
  seed: "pin5-marvel-v1",
  placeCount: MARVEL_COUNT,
} as const;

/** Deterministic order of place ids for the Marvel cycle. */
export function orderMarvelPlaceIds(
  placeIds: readonly string[],
  seed: string = MARVEL_SCHEDULE.seed,
): string[] {
  return orderFootballClubIds(placeIds, seed);
}

export function marvelCycleIndex(
  date: string,
  options: {
    cycleStartDate?: string;
    placeCount?: number;
  } = {},
): number {
  const cycleStartDate =
    options.cycleStartDate ?? MARVEL_SCHEDULE.cycleStartDate;
  const placeCount = options.placeCount ?? MARVEL_SCHEDULE.placeCount;
  const offset = calendarDaysSince(cycleStartDate, date);
  return ((offset % placeCount) + placeCount) % placeCount;
}

export function marvelGameNumber(date: string): number {
  if (!isValidIsoDate(date)) {
    throw new Error("Invalid ISO date for Marvel schedule");
  }
  if (date < MARVEL_SCHEDULE.cycleStartDate) {
    throw new Error(
      `Marvel date ${date} is before schedule start ${MARVEL_SCHEDULE.cycleStartDate}`,
    );
  }
  return calendarDaysSince(MARVEL_SCHEDULE.cycleStartDate, date) + 1;
}
