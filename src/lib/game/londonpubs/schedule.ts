/**
 * Deterministic London pubs schedule — one pub per released day, cycling the pool.
 */

import { isValidIsoDate } from "@/lib/game/date";
import {
  calendarDaysSince,
  orderFootballClubIds,
} from "@/lib/game/football/schedule";
import { LONDON_PUBS_COUNT } from "@/lib/game/londonpubs/dataset";

export const LONDON_PUBS_SCHEDULE = {
  version: 1,
  cycleStartDate: "2026-09-28",
  seed: "pin5-london-pubs-v1",
  placeCount: LONDON_PUBS_COUNT,
} as const;

/** Deterministic order of pub ids for the London pubs cycle. */
export function orderLondonPubIds(
  pubIds: readonly string[],
  seed: string = LONDON_PUBS_SCHEDULE.seed,
): string[] {
  return orderFootballClubIds(pubIds, seed);
}

export function londonPubsCycleIndex(
  date: string,
  options: {
    cycleStartDate?: string;
    placeCount?: number;
  } = {},
): number {
  const cycleStartDate =
    options.cycleStartDate ?? LONDON_PUBS_SCHEDULE.cycleStartDate;
  const placeCount = options.placeCount ?? LONDON_PUBS_SCHEDULE.placeCount;
  const offset = calendarDaysSince(cycleStartDate, date);
  return ((offset % placeCount) + placeCount) % placeCount;
}

export function londonPubsGameNumber(date: string): number {
  if (!isValidIsoDate(date)) {
    throw new Error("Invalid ISO date for London pubs schedule");
  }
  if (date < LONDON_PUBS_SCHEDULE.cycleStartDate) {
    throw new Error(
      `London pubs date ${date} is before schedule start ${LONDON_PUBS_SCHEDULE.cycleStartDate}`,
    );
  }
  return calendarDaysSince(LONDON_PUBS_SCHEDULE.cycleStartDate, date) + 1;
}
