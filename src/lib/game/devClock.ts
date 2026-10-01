import { cookies } from "next/headers";

import { DEV_DATE_COOKIE } from "@/lib/game/constants";
import { isValidIsoDate, type ClockOptions } from "@/lib/game/date";

/**
 * Read the temporary date-switcher cookie for API routes.
 * Allowed in production for now (beta testing); remove with the toolbar later.
 */
export async function getRequestClockOptions(): Promise<ClockOptions> {
  const store = await cookies();
  const value = store.get(DEV_DATE_COOKIE)?.value?.trim();
  if (!value || !isValidIsoDate(value)) {
    return {};
  }

  // Cookie wins over env overrides while the toolbar selection is active.
  return {
    devDate: value,
    devNow: null,
  };
}
