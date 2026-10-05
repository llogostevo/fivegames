/**
 * Deterministic World airports schedule — one airport per released day.
 */

import { isValidIsoDate } from "@/lib/game/date";
import {
  calendarDaysSince,
  orderFootballClubIds,
} from "@/lib/game/football/schedule";
import { WORLD_AIRPORTS_COUNT } from "@/lib/game/worldairports/dataset";

export const WORLD_AIRPORTS_SCHEDULE = {
  version: 1,
  cycleStartDate: "2026-09-28",
  seed: "pin5-world-airports-v1",
  placeCount: WORLD_AIRPORTS_COUNT,
} as const;

/** Deterministic order of airport ids for the World airports cycle. */
export function orderWorldAirportIds(
  airportIds: readonly string[],
  seed: string = WORLD_AIRPORTS_SCHEDULE.seed,
): string[] {
  return orderFootballClubIds(airportIds, seed);
}

export function worldAirportsCycleIndex(
  date: string,
  options: {
    cycleStartDate?: string;
    placeCount?: number;
  } = {},
): number {
  const cycleStartDate =
    options.cycleStartDate ?? WORLD_AIRPORTS_SCHEDULE.cycleStartDate;
  const placeCount = options.placeCount ?? WORLD_AIRPORTS_SCHEDULE.placeCount;
  const offset = calendarDaysSince(cycleStartDate, date);
  return ((offset % placeCount) + placeCount) % placeCount;
}

export function worldAirportsGameNumber(date: string): number {
  if (!isValidIsoDate(date)) {
    throw new Error("Invalid ISO date for World airports schedule");
  }
  if (date < WORLD_AIRPORTS_SCHEDULE.cycleStartDate) {
    throw new Error(
      `World airports date ${date} is before schedule start ${WORLD_AIRPORTS_SCHEDULE.cycleStartDate}`,
    );
  }
  return calendarDaysSince(WORLD_AIRPORTS_SCHEDULE.cycleStartDate, date) + 1;
}
