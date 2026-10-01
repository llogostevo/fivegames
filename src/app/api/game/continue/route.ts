import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { GAME_SESSION_COOKIE } from "@/lib/game/constants";
import { continueToNextClue } from "@/lib/game/evaluateGuess";
import { GameNotFoundError, loadGame } from "@/lib/game/loadGame";
import {
  decodeSession,
  encodeSession,
  sessionCookieOptions,
} from "@/lib/game/session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const session = decodeSession(cookieStore.get(GAME_SESSION_COOKIE)?.value);

    if (!session) {
      return NextResponse.json(
        { error: "No active game session. Start the game first." },
        { status: 409 },
      );
    }

    const game = await loadGame(session.gameId);
    const result = continueToNextClue({ game, session });
    const response = NextResponse.json(result.response);
    const cookie = sessionCookieOptions();
    response.cookies.set(cookie.name, encodeSession(result.session), cookie);
    return response;
  } catch (error) {
    if (error instanceof GameNotFoundError) {
      return NextResponse.json(
        { error: "No active game session. Start the game first." },
        { status: 409 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to continue";

    if (message === "Game is already complete") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
