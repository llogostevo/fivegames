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
 * URL appended to shared Daily score messages during beta.
 * Stays on the Vercel deployment until the public launch cutover.
 */
export const SHARE_URL = `${BETA_SITE_URL}/`;

/** Football share landing page. */
export const FOOTBALL_SHARE_URL = `${BETA_SITE_URL}/football`;

/** Share URL for a given game mode. */
export function shareUrlForMode(mode: "daily" | "football"): string {
  return mode === "football" ? FOOTBALL_SHARE_URL : SHARE_URL;
}
