/**
 * Deterministic Harry Potter schedule — one place per released day, cycling the pool.
 */

import { isValidIsoDate } from "@/lib/game/date";
import {
  calendarDaysSince,
  orderFootballClubIds,
} from "@/lib/game/football/schedule";
import { HARRY_POTTER_COUNT } from "@/lib/game/harrypotter/dataset";

export const HARRY_POTTER_SCHEDULE = {
  version: 1,
  cycleStartDate: "2026-10-06",
  seed: "pin5-harry-potter-v1",
  placeCount: HARRY_POTTER_COUNT,
} as const;

/** Deterministic order of place ids for the Harry Potter cycle. */
export function orderHarryPotterPlaceIds(
  placeIds: readonly string[],
  seed: string = HARRY_POTTER_SCHEDULE.seed,
): string[] {
  return orderFootballClubIds(placeIds, seed);
}

export function harryPotterCycleIndex(
  date: string,
  options: {
    cycleStartDate?: string;
    placeCount?: number;
  } = {},
): number {
  const cycleStartDate =
    options.cycleStartDate ?? HARRY_POTTER_SCHEDULE.cycleStartDate;
  const placeCount = options.placeCount ?? HARRY_POTTER_SCHEDULE.placeCount;
  const offset = calendarDaysSince(cycleStartDate, date);
  return ((offset % placeCount) + placeCount) % placeCount;
}

export function harryPotterGameNumber(date: string): number {
  if (!isValidIsoDate(date)) {
    throw new Error("Invalid ISO date for Harry Potter schedule");
  }
  if (date < HARRY_POTTER_SCHEDULE.cycleStartDate) {
    throw new Error(
      `Harry Potter date ${date} is before schedule start ${HARRY_POTTER_SCHEDULE.cycleStartDate}`,
    );
  }
  return calendarDaysSince(HARRY_POTTER_SCHEDULE.cycleStartDate, date) + 1;
}
