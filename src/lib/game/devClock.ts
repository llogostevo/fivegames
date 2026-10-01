import { cookies } from "next/headers";

import { DEV_DATE_COOKIE } from "@/lib/game/constants";
import {
  isDateOverrideUiEnabled,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";

/**
 * Read the temporary date-switcher cookie for API routes.
 * Enabled in development, or in production when FIVEGAMES_ALLOW_DATE_OVERRIDE=true.
 */
export async function getRequestClockOptions(): Promise<ClockOptions> {
  if (!isDateOverrideUiEnabled()) {
    return {};
  }

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
