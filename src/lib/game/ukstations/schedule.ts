/**
 * Deterministic UK National Rail schedule — one ready station per released day.
 */

import { isValidIsoDate } from "@/lib/game/date";
import {
  calendarDaysSince,
  orderFootballClubIds,
} from "@/lib/game/football/schedule";
import { UK_RAIL_READY_COUNT } from "@/lib/game/ukstations/dataset";

export const UK_RAIL_SCHEDULE = {
  version: 1,
  cycleStartDate: "2026-09-28",
  seed: "pin5-uk-stations-v1",
  placeCount: UK_RAIL_READY_COUNT,
} as const;

export function orderUkRailStationIds(
  stationIds: readonly string[],
  seed: string = UK_RAIL_SCHEDULE.seed,
): string[] {
  return orderFootballClubIds(stationIds, seed);
}

export function ukRailCycleIndex(
  date: string,
  options: {
    cycleStartDate?: string;
    placeCount?: number;
  } = {},
): number {
  const cycleStartDate =
    options.cycleStartDate ?? UK_RAIL_SCHEDULE.cycleStartDate;
  const placeCount = options.placeCount ?? UK_RAIL_SCHEDULE.placeCount;
  const offset = calendarDaysSince(cycleStartDate, date);
  return ((offset % placeCount) + placeCount) % placeCount;
}

export function ukRailGameNumber(date: string): number {
  if (!isValidIsoDate(date)) {
    throw new Error("Invalid ISO date for UK rail schedule");
  }
  if (date < UK_RAIL_SCHEDULE.cycleStartDate) {
    throw new Error(
      `UK rail date ${date} is before schedule start ${UK_RAIL_SCHEDULE.cycleStartDate}`,
    );
  }
  return calendarDaysSince(UK_RAIL_SCHEDULE.cycleStartDate, date) + 1;
}
