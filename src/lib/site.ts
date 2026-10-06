import { sanitiseCampaignRef } from "@/lib/analytics/campaign";
import {
  getModeDefinition,
  type GameMode,
} from "@/lib/game/modes";

/**
 * Canonical public origin for PIN5 (shares, Open Graph, absolute links).
 * Override with NEXT_PUBLIC_SITE_URL if needed.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pin5.co.uk";

/**
 * @deprecated Use SITE_URL — kept for older imports/tests.
 */
export const BETA_SITE_URL = SITE_URL;

/**
 * @deprecated Prefer shareUrlForMode("daily") — root is now the hub.
 * Kept for tests that assert the legacy constant shape.
 */
export const SHARE_URL = `${SITE_URL}/daily`;

/** @deprecated Prefer shareUrlForMode("football"). */
export const FOOTBALL_SHARE_URL = `${SITE_URL}/football/england`;

/** Absolute share URL for a game mode. */
export function shareUrlForMode(
  mode: GameMode,
  options?: { ref?: string | null },
): string {
  const path = getModeDefinition(mode).sharePath;
  const base = `${SITE_URL}${path}`;
  const ref = sanitiseCampaignRef(options?.ref);
  if (!ref) {
    return base;
  }
  const params = new URLSearchParams({ ref });
  return `${base}?${params.toString()}`;
}
