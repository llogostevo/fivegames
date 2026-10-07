import { NextResponse } from "next/server";

import { getRequestClockOptions } from "@/lib/game/devClock";
import {
  GameNotFoundError,
  getTodaysGameForMode,
  missingGameDeveloperMessage,
  missingGamePlayerMessage,
} from "@/lib/game/loadGame";
import {
  readSignedSessionForMode,
  requestGameMode,
} from "@/lib/game/requestSession";
import {
  encodeSession,
  SessionSecretConfigError,
  sessionCookieOptions,
} from "@/lib/game/session";
import { resolveStartGame } from "@/lib/game/startGame";

const GENERIC_START_ERROR = "Couldn't start today's game.";

export async function POST(request: Request) {
  try {
    const mode = requestGameMode(request);
    const clock = await getRequestClockOptions();
    // Release-gated: only the currently available game for this mode (06:00 London).
    const game = await getTodaysGameForMode(mode, new Date(), clock);

    const existingSession = await readSignedSessionForMode(mode);

    const result = resolveStartGame({
      game,
      existingSession,
      clockOptions: clock,
    });

    const cookie = sessionCookieOptions(mode);
    const response = NextResponse.json(result.body);
    // Always re-set the cookie so maxAge refreshes on resume.
    response.cookies.set(cookie.name, encodeSession(result.session), cookie);
    return response;
  } catch (error) {
    if (error instanceof SessionSecretConfigError) {
      console.error(error.message);
      return NextResponse.json({ error: GENERIC_START_ERROR }, { status: 500 });
    }

    if (error instanceof GameNotFoundError) {
      const isDev = process.env.NODE_ENV !== "production";
      return NextResponse.json(
        {
          error: isDev
            ? missingGameDeveloperMessage(error.date)
            : missingGamePlayerMessage(),
        },
        { status: 404 },
      );
    }

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: GENERIC_START_ERROR }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : GENERIC_START_ERROR;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
