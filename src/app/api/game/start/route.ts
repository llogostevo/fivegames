import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { GAME_SESSION_COOKIE } from "@/lib/game/constants";
import { getRequestClockOptions } from "@/lib/game/devClock";
import {
  GameNotFoundError,
  getTodaysGame,
  missingGameDeveloperMessage,
  missingGamePlayerMessage,
} from "@/lib/game/loadGame";
import {
  decodeSession,
  encodeSession,
  SessionSecretConfigError,
  sessionCookieOptions,
} from "@/lib/game/session";
import { resolveStartGame } from "@/lib/game/startGame";

const GENERIC_START_ERROR = "Couldn't start today's game.";

export async function POST() {
  try {
    const clock = await getRequestClockOptions();
    // Release-gated: only the currently available daily game (08:00 London).
    const game = await getTodaysGame(new Date(), clock);

    const cookieStore = await cookies();
    const existingSession = decodeSession(
      cookieStore.get(GAME_SESSION_COOKIE)?.value,
    );

    const result = resolveStartGame({
      game,
      existingSession,
      clockOptions: clock,
    });

    const cookie = sessionCookieOptions();
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
