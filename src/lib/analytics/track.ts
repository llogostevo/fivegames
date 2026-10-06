/**
 * Lightweight Pin5 analytics — Vercel custom events + local first-party state.
 * Failures must never affect gameplay.
 */

import { track as vercelTrack } from "@vercel/analytics";

import type { GameMode } from "@/lib/game/modes";

export type AnalyticsPropertyValue = string | number | boolean | null;

type AnalyticsProperties = Record<string, AnalyticsPropertyValue>;

/** Safe wrapper around Vercel `track` — never throws. */
export function trackEvent(
  name: string,
  properties?: AnalyticsProperties,
): void {
  try {
    if (typeof window === "undefined") {
      return;
    }
    vercelTrack(name, properties);
  } catch {
    // Analytics must never break gameplay.
  }
}

export function trackGameStarted(input: {
  game: GameMode;
  campaignRef: string;
}): void {
  trackEvent("game_started", {
    game: input.game,
    campaign_ref: input.campaignRef,
  });
}

export function trackGameCompleted(input: {
  game: GameMode;
  scoreBand: string;
  cluesUsed: number;
  durationSeconds: number | null;
  foundLocation: boolean;
  campaignRef: string;
}): void {
  trackEvent("game_completed", {
    game: input.game,
    score_band: input.scoreBand,
    clues_used: input.cluesUsed,
    duration_seconds: input.durationSeconds,
    found_location: input.foundLocation,
    campaign_ref: input.campaignRef,
  });
}

export function trackResultShared(input: {
  game: GameMode;
  shareMethod: "web_share" | "clipboard";
  campaignRef: string;
}): void {
  trackEvent("result_shared", {
    game: input.game,
    share_method: input.shareMethod,
    campaign_ref: input.campaignRef,
  });
}

export function trackPlayAnother(input: {
  fromGame: GameMode;
  toGame: GameMode;
  campaignRef: string;
}): void {
  if (input.fromGame === input.toGame) {
    return;
  }
  trackEvent("play_another", {
    from_game: input.fromGame,
    to_game: input.toGame,
    campaign_ref: input.campaignRef,
  });
}

/** Bucket scores to keep custom-event cardinality low. */
export function scoreBandFromTotal(score: number): string {
  if (!Number.isFinite(score) || score < 0) {
    return "unknown";
  }
  if (score >= 25_000) return "25000";
  if (score >= 20_000) return "20000-24999";
  if (score >= 15_000) return "15000-19999";
  if (score >= 10_000) return "10000-14999";
  if (score >= 5_000) return "5000-9999";
  return "0-4999";
}
