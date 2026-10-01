/**
 * PIN5 share / week numbering configuration.
 * Tune thresholds and the week-one Monday here — not in UI components.
 */

/**
 * Monday that starts PIN5 Week 1 (first public/beta week).
 * Must remain a Monday. Week numbers count forward from this date.
 */
export const PIN5_WEEK_ONE_START = "2026-09-28";

/**
 * Full-week score at or above this may use the stronger weekly brag line.
 * Incomplete weeks (fewer than 7 played) always use the softer line.
 */
export const WEEKLY_SHARE_BRAG_SCORE_THRESHOLD = 140_000;
