/**
 * Deterministic Star Wars schedule — one place per released day, cycling the pool.
 */

import { isValidIsoDate } from "@/lib/game/date";
import {
  calendarDaysSince,
  orderFootballClubIds,
} from "@/lib/game/football/schedule";
import { STAR_WARS_COUNT } from "@/lib/game/starwars/dataset";

export const STAR_WARS_SCHEDULE = {
  version: 1,
  cycleStartDate: "2026-10-06",
  seed: "pin5-star-wars-v1",
  placeCount: STAR_WARS_COUNT,
} as const;

/** Deterministic order of place ids for the Star Wars cycle. */
export function orderStarWarsPlaceIds(
  placeIds: readonly string[],
  seed: string = STAR_WARS_SCHEDULE.seed,
): string[] {
  return orderFootballClubIds(placeIds, seed);
}

export function starWarsCycleIndex(
  date: string,
  options: {
    cycleStartDate?: string;
    placeCount?: number;
  } = {},
): number {
  const cycleStartDate =
    options.cycleStartDate ?? STAR_WARS_SCHEDULE.cycleStartDate;
  const placeCount = options.placeCount ?? STAR_WARS_SCHEDULE.placeCount;
  const offset = calendarDaysSince(cycleStartDate, date);
  return ((offset % placeCount) + placeCount) % placeCount;
}

export function starWarsGameNumber(date: string): number {
  if (!isValidIsoDate(date)) {
    throw new Error("Invalid ISO date for Star Wars schedule");
  }
  if (date < STAR_WARS_SCHEDULE.cycleStartDate) {
    throw new Error(
      `Star Wars date ${date} is before schedule start ${STAR_WARS_SCHEDULE.cycleStartDate}`,
    );
  }
  return calendarDaysSince(STAR_WARS_SCHEDULE.cycleStartDate, date) + 1;
}
