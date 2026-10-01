import { cookies } from "next/headers";

import { DEV_DATE_COOKIE } from "@/lib/game/constants";
import { isValidIsoDate, type ClockOptions } from "@/lib/game/date";

/**
 * Read the temporary dev-toolbar date cookie for API routes.
 * Never applies in production.
 */
export async function getRequestClockOptions(): Promise<ClockOptions> {
  if (process.env.NODE_ENV === "production") {
    return {};
  }

  const store = await cookies();
  const value = store.get(DEV_DATE_COOKIE)?.value?.trim();
  if (!value || !isValidIsoDate(value)) {
    return {};
  }

  // Cookie wins over env overrides while the toolbar selection is active.
  return {
    nodeEnv: "development",
    devDate: value,
    devNow: null,
  };
}
