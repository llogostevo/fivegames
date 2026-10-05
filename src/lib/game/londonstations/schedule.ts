/**
 * Deterministic London stations schedule — one station per released day.
 */

import { isValidIsoDate } from "@/lib/game/date";
import {
  calendarDaysSince,
  orderFootballClubIds,
} from "@/lib/game/football/schedule";
import { LONDON_STATIONS_COUNT } from "@/lib/game/londonstations/dataset";

export const LONDON_STATIONS_SCHEDULE = {
  version: 1,
  cycleStartDate: "2026-09-28",
  seed: "pin5-london-stations-v1",
  placeCount: LONDON_STATIONS_COUNT,
} as const;

/** Deterministic order of station ids for the London stations cycle. */
export function orderLondonStationIds(
  stationIds: readonly string[],
  seed: string = LONDON_STATIONS_SCHEDULE.seed,
): string[] {
  return orderFootballClubIds(stationIds, seed);
}

export function londonStationsCycleIndex(
  date: string,
  options: {
    cycleStartDate?: string;
    placeCount?: number;
  } = {},
): number {
  const cycleStartDate =
    options.cycleStartDate ?? LONDON_STATIONS_SCHEDULE.cycleStartDate;
  const placeCount = options.placeCount ?? LONDON_STATIONS_SCHEDULE.placeCount;
  const offset = calendarDaysSince(cycleStartDate, date);
  return ((offset % placeCount) + placeCount) % placeCount;
}

export function londonStationsGameNumber(date: string): number {
  if (!isValidIsoDate(date)) {
    throw new Error("Invalid ISO date for London stations schedule");
  }
  if (date < LONDON_STATIONS_SCHEDULE.cycleStartDate) {
    throw new Error(
      `London stations date ${date} is before schedule start ${LONDON_STATIONS_SCHEDULE.cycleStartDate}`,
    );
  }
  return calendarDaysSince(LONDON_STATIONS_SCHEDULE.cycleStartDate, date) + 1;
}
