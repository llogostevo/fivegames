import {
  getModeDefinition,
  type GameMode,
} from "@/lib/game/modes";

/**
 * Public beta origin for PIN5.
 * Keep share / metadata on this host until pin5.co.uk launches.
 */
export const BETA_SITE_URL = "https://fivegames.vercel.app";

/**
 * Canonical site origin for absolute metadata URLs (Open Graph, etc.).
 * Defaults to the beta host; override with NEXT_PUBLIC_SITE_URL if needed.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? BETA_SITE_URL;

/**
 * @deprecated Prefer shareUrlForMode("daily") — root is now the hub.
 * Kept for tests that assert the legacy constant shape.
 */
export const SHARE_URL = `${BETA_SITE_URL}/daily`;

/** @deprecated Prefer shareUrlForMode("football"). */
export const FOOTBALL_SHARE_URL = `${BETA_SITE_URL}/football/england`;

/** Absolute share URL for a game mode. */
export function shareUrlForMode(mode: GameMode): string {
  const path = getModeDefinition(mode).sharePath;
  return `${BETA_SITE_URL}${path}`;
}
