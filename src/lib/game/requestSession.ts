import { cookies } from "next/headers";

import {
  SESSION_COOKIE_BY_MODE,
  getModeFromRequestUrl,
  type GameMode,
} from "@/lib/game/modes";
import {
  decodeSession,
  sessionMode,
  type GameSession,
} from "@/lib/game/session";

/** Resolve game mode from `?mode=` (defaults to daily). */
export function requestGameMode(request: Request): GameMode {
  return getModeFromRequestUrl(request.url);
}

/**
 * Read the HMAC-signed session cookie for a mode.
 * Rejects cookies whose payload mode does not match (cross-mode isolation).
 */
export async function readSignedSessionForMode(
  mode: GameMode,
): Promise<GameSession | null> {
  const cookieStore = await cookies();
  const session = decodeSession(
    cookieStore.get(SESSION_COOKIE_BY_MODE[mode])?.value,
  );
  if (!session) {
    return null;
  }
  if (sessionMode(session) !== mode) {
    return null;
  }
  return session;
}
