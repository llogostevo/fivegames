import {
  DAILY_GAME_CONFIG,
  type DailyGameConfig,
} from "@/lib/game/dailyConfig";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LONDON_WALL_PATTERN =
  /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/** Calendar timezone used for the daily game. */
export const GAME_TIMEZONE = DAILY_GAME_CONFIG.timezone;

export type LondonDateTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export type ClockOptions = {
  /** Override for tests; defaults to `process.env.NODE_ENV`. */
  nodeEnv?: string;
  /**
   * Absolute instant for tests (takes precedence over env / date overrides).
   */
  now?: Date;
  /**
   * Override for tests; defaults to `process.env.FIVEGAMES_DEV_NOW`.
   * Pass `null` to force “no override”.
   */
  devNow?: string | null;
  /**
   * Legacy date-only override; defaults to `process.env.FIVEGAMES_DEV_DATE`.
   * Interpreted as 12:00 Europe/London on that date (after the default 08:00 release).
   * Pass `null` to force “no override”.
   */
  devDate?: string | null;
};

export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));

  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function addCalendarDays(isoDate: string, days: number): string {
  if (!isValidIsoDate(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

function readLondonParts(now: Date): LondonDateTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: GAME_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour"),
    minute: read("minute"),
    second: read("second"),
  };
}

export function getLondonDateTime(now: Date = new Date()): LondonDateTime {
  return readLondonParts(now);
}

/**
 * Format an instant as YYYY-MM-DD in Europe/London.
 */
export function getLondonDateISO(now: Date = new Date()): string {
  const { year, month, day } = getLondonDateTime(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Convert a Europe/London civil wall time to a UTC Date.
 * Handles GMT/BST via iterative correction against Intl.
 */
export function londonWallTimeToUtc(
  isoDate: string,
  hour: number,
  minute: number,
  second = 0,
): Date {
  if (!isValidIsoDate(isoDate)) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }
  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    throw new Error("Invalid London wall time");
  }

  const [year, month, day] = isoDate.split("-").map(Number);
  const desiredAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  let guess = desiredAsUtcMs;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getLondonDateTime(new Date(guess));
    const asLondonMs = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const diff = desiredAsUtcMs - asLondonMs;
    guess += diff;
    if (diff === 0) {
      break;
    }
  }

  return new Date(guess);
}

/**
 * Parse a development clock override.
 * - Absolute: `2026-10-06T07:59:00.000Z` (or any Date-parsable offset form)
 * - London wall: `2026-10-06T07:59` / `2026-10-06T07:59:00`
 * - Date only: `2026-10-06` → 12:00 Europe/London
 */
export function parseDevNow(value: string): Date {
  const trimmed = value.trim();

  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    const absolute = new Date(trimmed);
    if (Number.isNaN(absolute.getTime())) {
      throw new Error(`Invalid FIVEGAMES_DEV_NOW "${value}".`);
    }
    return absolute;
  }

  const wall = LONDON_WALL_PATTERN.exec(trimmed);
  if (!wall || !isValidIsoDate(wall[1])) {
    throw new Error(
      `Invalid FIVEGAMES_DEV_NOW "${value}". Use YYYY-MM-DDTHH:mm (London) or an ISO instant.`,
    );
  }

  const hour = wall[2] !== undefined ? Number(wall[2]) : 12;
  const minute = wall[3] !== undefined ? Number(wall[3]) : 0;
  const second = wall[4] !== undefined ? Number(wall[4]) : 0;
  return londonWallTimeToUtc(wall[1], hour, minute, second);
}

/**
 * Whether the temporary on-page date switcher (and its cookie) is enabled.
 * Env date overrides (`FIVEGAMES_DEV_DATE` / `FIVEGAMES_DEV_NOW`) work whenever set,
 * including production — use those to force a game for all visitors.
 */
export function isDateOverrideUiEnabled(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): boolean {
  if (nodeEnv !== "production") {
    return true;
  }
  return process.env.FIVEGAMES_ALLOW_DATE_OVERRIDE === "true";
}

/**
 * Resolve the clock used for daily release decisions.
 *
 * When `FIVEGAMES_DEV_NOW` or `FIVEGAMES_DEV_DATE` is set (or passed via options),
 * that override is used in any environment — including production — so a shared
 * test deployment can pin a game for audiences. Leave both unset for the real clock.
 */
export function resolveClock(
  now: Date = new Date(),
  options: ClockOptions = {},
): Date {
  if (options.now) {
    return options.now;
  }

  const devNow =
    options.devNow !== undefined
      ? options.devNow?.trim() || undefined
      : process.env.FIVEGAMES_DEV_NOW?.trim();
  if (devNow) {
    return parseDevNow(devNow);
  }

  const devDate =
    options.devDate !== undefined
      ? options.devDate?.trim() || undefined
      : process.env.FIVEGAMES_DEV_DATE?.trim();
  if (devDate) {
    if (!isValidIsoDate(devDate)) {
      throw new Error(
        `Invalid FIVEGAMES_DEV_DATE "${devDate}". Use YYYY-MM-DD.`,
      );
    }
    // Noon London ⇒ after the default 08:00 release on that calendar day.
    return londonWallTimeToUtc(devDate, 12, 0);
  }

  return now;
}

/**
 * ISO date of the game that is currently released at `now`.
 * A dated game becomes available at the configured London release time,
 * not at midnight.
 */
export function getAvailableGameDate(
  now: Date = new Date(),
  options: ClockOptions = {},
  config: DailyGameConfig = DAILY_GAME_CONFIG,
): string {
  const clock = resolveClock(now, options);
  const london = getLondonDateTime(clock);
  const londonDate = `${london.year}-${String(london.month).padStart(2, "0")}-${String(london.day).padStart(2, "0")}`;
  const currentMinutes = london.hour * 60 + london.minute;
  const releaseMinutes = config.releaseHour * 60 + config.releaseMinute;

  if (currentMinutes >= releaseMinutes) {
    return londonDate;
  }

  return addCalendarDays(londonDate, -1);
}

/**
 * @deprecated Use getAvailableGameDate — kept for call-site clarity during migration.
 * Returns the available game date (release-aware), not midnight calendar date.
 */
export function getEffectiveGameDate(
  now: Date = new Date(),
  options: ClockOptions = {},
  config: DailyGameConfig = DAILY_GAME_CONFIG,
): string {
  return getAvailableGameDate(now, options, config);
}

/** Instant of the next configured daily release at or after `now`. */
export function getNextReleaseAt(
  now: Date = new Date(),
  options: ClockOptions = {},
  config: DailyGameConfig = DAILY_GAME_CONFIG,
): Date {
  const clock = resolveClock(now, options);
  const londonDate = getLondonDateISO(clock);
  const todayRelease = londonWallTimeToUtc(
    londonDate,
    config.releaseHour,
    config.releaseMinute,
  );

  if (clock.getTime() < todayRelease.getTime()) {
    return todayRelease;
  }

  return londonWallTimeToUtc(
    addCalendarDays(londonDate, 1),
    config.releaseHour,
    config.releaseMinute,
  );
}

export function isGameDateReleased(
  gameDate: string,
  now: Date = new Date(),
  options: ClockOptions = {},
  config: DailyGameConfig = DAILY_GAME_CONFIG,
): boolean {
  if (!isValidIsoDate(gameDate)) {
    return false;
  }
  return gameDate <= getAvailableGameDate(now, options, config);
}

/** Format a remaining duration as `11h 14m 32s`. */
export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}
