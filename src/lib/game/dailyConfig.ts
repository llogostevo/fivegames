/**
 * Central daily-game release schedule.
 * Change releaseHour / releaseMinute here to move the daily drop.
 * Times are Europe/London wall clock (GMT in winter, BST in summer).
 */
export const DAILY_GAME_CONFIG = {
  timezone: "Europe/London",
  /** 0–23 in Europe/London local time. */
  releaseHour: 6,
  /** 0–59 in Europe/London local time. */
  releaseMinute: 0,
} as const;

export type DailyGameConfig = {
  timezone: string;
  releaseHour: number;
  releaseMinute: number;
};

/** Human-friendly release time derived from config, e.g. "6am" or "9:30am". */
export function formatReleaseTimeLabel(
  config: DailyGameConfig = DAILY_GAME_CONFIG,
): string {
  const hour24 = config.releaseHour;
  const minute = config.releaseMinute;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const suffix = hour24 < 12 ? "am" : "pm";
  if (minute === 0) {
    return `${hour12}${suffix}`;
  }
  return `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
}

export function formatDailyReleaseBlurb(
  config: DailyGameConfig = DAILY_GAME_CONFIG,
): string {
  return `A new Pin5 every morning at ${formatReleaseTimeLabel(config)}.`;
}
