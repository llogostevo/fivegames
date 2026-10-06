/**
 * Deterministic Taylor Swift schedule — one place per released day, cycling the pool.
 */

import { isValidIsoDate } from "@/lib/game/date";
import {
  calendarDaysSince,
  orderFootballClubIds,
} from "@/lib/game/football/schedule";
import { TAYLOR_SWIFT_COUNT } from "@/lib/game/taylorswift/dataset";

export const TAYLOR_SWIFT_SCHEDULE = {
  version: 1,
  cycleStartDate: "2026-10-06",
  seed: "pin5-taylor-swift-v1",
  placeCount: TAYLOR_SWIFT_COUNT,
} as const;

/** Deterministic order of place ids for the Taylor Swift cycle. */
export function orderTaylorSwiftPlaceIds(
  placeIds: readonly string[],
  seed: string = TAYLOR_SWIFT_SCHEDULE.seed,
): string[] {
  return orderFootballClubIds(placeIds, seed);
}

export function taylorSwiftCycleIndex(
  date: string,
  options: {
    cycleStartDate?: string;
    placeCount?: number;
  } = {},
): number {
  const cycleStartDate =
    options.cycleStartDate ?? TAYLOR_SWIFT_SCHEDULE.cycleStartDate;
  const placeCount = options.placeCount ?? TAYLOR_SWIFT_SCHEDULE.placeCount;
  const offset = calendarDaysSince(cycleStartDate, date);
  return ((offset % placeCount) + placeCount) % placeCount;
}

export function taylorSwiftGameNumber(date: string): number {
  if (!isValidIsoDate(date)) {
    throw new Error("Invalid ISO date for Taylor Swift schedule");
  }
  if (date < TAYLOR_SWIFT_SCHEDULE.cycleStartDate) {
    throw new Error(
      `Taylor Swift date ${date} is before schedule start ${TAYLOR_SWIFT_SCHEDULE.cycleStartDate}`,
    );
  }
  return calendarDaysSince(TAYLOR_SWIFT_SCHEDULE.cycleStartDate, date) + 1;
}
