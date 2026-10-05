import { NextResponse } from "next/server";

import { getRequestClockOptions } from "@/lib/game/devClock";
import { checkPin } from "@/lib/game/evaluateGuess";
import {
  readSignedSessionForMode,
  requestGameMode,
} from "@/lib/game/requestSession";
import {
  encodeSession,
  SessionSecretConfigError,
  sessionCookieOptions,
} from "@/lib/game/session";
import {
  loadGameForSession,
  SessionAccessError,
} from "@/lib/game/sessionAccess";

const GENERIC_SESSION_ERROR = "No active game session. Start the game first.";
const GENERIC_ACTION_ERROR = "Couldn't check that pin.";

export async function POST(request: Request) {
  try {
    const mode = requestGameMode(request);
    const session = await readSignedSessionForMode(mode);

    if (!session) {
      return NextResponse.json({ error: GENERIC_SESSION_ERROR }, { status: 409 });
    }

    const clock = await getRequestClockOptions();
    const game = await loadGameForSession(session, clock);

    const body: unknown = await request.json();
    const guess =
      body && typeof body === "object"
        ? (body as { lat?: unknown; lng?: unknown })
        : null;

    // Only lat/lng are read — ignore any client foundLocation / score claims.
    const result = checkPin({
      game,
      session,
      guess: { lat: guess?.lat, lng: guess?.lng },
      clockOptions: clock,
    });

    // Always persist: unsuccessful commits also consume a pin.
    const response = NextResponse.json(result.response);
    const cookie = sessionCookieOptions(mode);
    response.cookies.set(cookie.name, encodeSession(result.session), cookie);
    return response;
  } catch (error) {
    if (error instanceof SessionSecretConfigError) {
      console.error(error.message);
      return NextResponse.json({ error: GENERIC_ACTION_ERROR }, { status: 500 });
    }

    if (error instanceof SessionAccessError) {
      return NextResponse.json({ error: GENERIC_SESSION_ERROR }, { status: 409 });
    }

    const message =
      error instanceof Error ? error.message : GENERIC_ACTION_ERROR;

    if (process.env.NODE_ENV === "production") {
      if (
        message === "Invalid guess coordinates" ||
        message === "Finish the current clue decision before guessing again" ||
        message === "All guesses are already locked" ||
        message === "Game is already complete" ||
        message === "Session does not match game"
      ) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      return NextResponse.json({ error: GENERIC_ACTION_ERROR }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
