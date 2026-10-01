/**
 * Central daily-game release schedule.
 * Change releaseHour / releaseMinute here to move the daily drop.
 */
export const DAILY_GAME_CONFIG = {
  timezone: "Europe/London",
  /** 0–23 in Europe/London local time. */
  releaseHour: 8,
  /** 0–59 in Europe/London local time. */
  releaseMinute: 0,
} as const;

export type DailyGameConfig = {
  timezone: string;
  releaseHour: number;
  releaseMinute: number;
};

/** Human-friendly release time derived from config, e.g. "8:00am" or "9:30am". */
export function formatReleaseTimeLabel(
  config: DailyGameConfig = DAILY_GAME_CONFIG,
): string {
  const hour24 = config.releaseHour;
  const minute = config.releaseMinute;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const suffix = hour24 < 12 ? "am" : "pm";
  return `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
}

export function formatDailyReleaseBlurb(
  config: DailyGameConfig = DAILY_GAME_CONFIG,
): string {
  return `New game every day at ${formatReleaseTimeLabel(config)}`;
}
