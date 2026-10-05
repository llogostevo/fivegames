import { NextResponse } from "next/server";

import { getRequestClockOptions } from "@/lib/game/devClock";
import { continueToNextClue } from "@/lib/game/evaluateGuess";
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
const GENERIC_ACTION_ERROR = "Couldn't continue.";

export async function POST(request: Request) {
  try {
    const mode = requestGameMode(request);
    const session = await readSignedSessionForMode(mode);

    if (!session) {
      return NextResponse.json({ error: GENERIC_SESSION_ERROR }, { status: 409 });
    }

    const clock = await getRequestClockOptions();
    const game = await loadGameForSession(session, clock);
    const result = continueToNextClue({ game, session });
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

    if (message === "Game is already complete") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    if (process.env.NODE_ENV === "production") {
      if (
        message === "Lock a guess before continuing" ||
        message === "No pending decision to continue from" ||
        message === "No further clues available" ||
        message === "Session does not match game"
      ) {
        return NextResponse.json({ error: message }, { status: 400 });
      }
      return NextResponse.json({ error: GENERIC_ACTION_ERROR }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
