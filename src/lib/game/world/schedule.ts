/**
 * Deterministic World schedule — one place per released day, cycling the pool.
 */

import { isValidIsoDate } from "@/lib/game/date";
import {
  calendarDaysSince,
  orderFootballClubIds,
} from "@/lib/game/football/schedule";
import { WORLD_PLACE_COUNT } from "@/lib/game/world/dataset";

export const WORLD_SCHEDULE = {
  version: 1,
  cycleStartDate: "2026-09-28",
  seed: "pin5-world-v1",
  placeCount: WORLD_PLACE_COUNT,
} as const;

/** Deterministic order of place ids for the World cycle. */
export function orderWorldPlaceIds(
  placeIds: readonly string[],
  seed: string = WORLD_SCHEDULE.seed,
): string[] {
  return orderFootballClubIds(placeIds, seed);
}

export function worldCycleIndex(
  date: string,
  options: {
    cycleStartDate?: string;
    placeCount?: number;
  } = {},
): number {
  const cycleStartDate =
    options.cycleStartDate ?? WORLD_SCHEDULE.cycleStartDate;
  const placeCount = options.placeCount ?? WORLD_SCHEDULE.placeCount;
  const offset = calendarDaysSince(cycleStartDate, date);
  return ((offset % placeCount) + placeCount) % placeCount;
}

export function worldGameNumber(date: string): number {
  if (!isValidIsoDate(date)) {
    throw new Error("Invalid ISO date for world schedule");
  }
  if (date < WORLD_SCHEDULE.cycleStartDate) {
    throw new Error(
      `World date ${date} is before schedule start ${WORLD_SCHEDULE.cycleStartDate}`,
    );
  }
  return calendarDaysSince(WORLD_SCHEDULE.cycleStartDate, date) + 1;
}
