import { cookies } from "next/headers";

import { DEV_DATE_COOKIE } from "@/lib/game/constants";

/**
 * Server-only gate for the development date toolbar.
 *
 * In production builds `process.env.NODE_ENV === "production"` is inlined,
 * so the dynamic import of DevDateToolbar is dead-code-eliminated and its
 * client module (including any labels) must not appear in the client bundle.
 */
export async function DevDateToolbarHost() {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const { DevDateToolbar } = await import("@/components/dev/DevDateToolbar");
  const store = await cookies();
  const initialDevDate = store.get(DEV_DATE_COOKIE)?.value ?? "";
  return <DevDateToolbar initialDate={initialDevDate} />;
}
