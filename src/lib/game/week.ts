import { addCalendarDays, isValidIsoDate } from "@/lib/game/date";
import { PIN5_WEEK_ONE_START } from "@/lib/game/shareConfig";

function utcNoonMs(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day, 12);
}

/** Monday–Sunday week containing `isoDate` (calendar date, not UTC wall time). */
export function getWeekStart(isoDate: string): string {
  if (!isValidIsoDate(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  const weekday = new Date(utcNoonMs(isoDate)).getUTCDay();
  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;
  return addCalendarDays(isoDate, -daysFromMonday);
}

/** Seven ISO dates Mon…Sun for the week containing `isoDate`. */
export function getWeekDates(isoDate: string): string[] {
  const start = getWeekStart(isoDate);
  return Array.from({ length: 7 }, (_, index) => addCalendarDays(start, index));
}

/** 0 = Sunday … 6 = Saturday for an ISO calendar date. */
export function getWeekdayIndex(isoDate: string): number {
  if (!isValidIsoDate(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  return new Date(utcNoonMs(isoDate)).getUTCDay();
}

/** True when `isoDate` is a Sunday on the London/calendar date grid. */
export function isSunday(isoDate: string): boolean {
  return getWeekdayIndex(isoDate) === 0;
}

/**
 * Sequential PIN5 week number (Week 1, Week 2, …) from PIN5_WEEK_ONE_START.
 * Not the ISO calendar week number.
 */
export function getPin5WeekNumber(
  isoDate: string,
  weekOneStart: string = PIN5_WEEK_ONE_START,
): number {
  if (!isValidIsoDate(isoDate) || !isValidIsoDate(weekOneStart)) {
    throw new Error("Invalid ISO date for PIN5 week number");
  }
  if (getWeekdayIndex(weekOneStart) !== 1) {
    throw new Error(`PIN5 week one start must be a Monday: ${weekOneStart}`);
  }

  const weekStart = getWeekStart(isoDate);
  const epochStart = getWeekStart(weekOneStart);
  const deltaDays = Math.round(
    (utcNoonMs(weekStart) - utcNoonMs(epochStart)) / 86_400_000,
  );
  return Math.floor(deltaDays / 7) + 1;
}

/**
 * Weekly share is offered only after the Sunday game for that week is complete.
 * Pass the completed game's date (server reveal date).
 */
export function isWeeklyShareAvailable(completedGameDate: string): boolean {
  return isValidIsoDate(completedGameDate) && isSunday(completedGameDate);
}
