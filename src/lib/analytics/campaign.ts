/**
 * Campaign / referral attribution via `?ref=`.
 * First meaningful ref wins for this browser; never overwritten later.
 */

export const CAMPAIGN_REF_MAX_LENGTH = 40;
export const DEFAULT_CAMPAIGN_REF = "direct";
export const FRIEND_SHARE_REF = "friend-share";

const REF_PATTERN = /^[a-z0-9][a-z0-9_-]{0,38}$/;

/** Validate and normalise a ref query value, or null if unsafe/empty. */
export function sanitiseCampaignRef(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed.length > CAMPAIGN_REF_MAX_LENGTH) {
    return null;
  }
  if (!REF_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
}

/** Read `ref` from a URLSearchParams / query string. */
export function readCampaignRefFromSearch(
  search: string | URLSearchParams | null | undefined,
): string | null {
  try {
    if (!search) {
      return null;
    }
    const params =
      typeof search === "string"
        ? new URLSearchParams(
            search.startsWith("?") ? search.slice(1) : search,
          )
        : search;
    return sanitiseCampaignRef(params.get("ref"));
  } catch {
    return null;
  }
}
