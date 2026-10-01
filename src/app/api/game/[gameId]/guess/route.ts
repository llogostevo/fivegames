import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { GAME_SESSION_COOKIE } from "@/lib/game/constants";
import { lockGuess } from "@/lib/game/evaluateGuess";
import { loadGame } from "@/lib/game/loadGame";
import {
  decodeSession,
  encodeSession,
  sessionCookieOptions,
} from "@/lib/game/session";

type RouteContext = {
  params: Promise<{ gameId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { gameId } = await context.params;
    const game = await loadGame(gameId);

    const cookieStore = await cookies();
    const session = decodeSession(cookieStore.get(GAME_SESSION_COOKIE)?.value);

    if (!session || session.gameId !== game.id) {
      return NextResponse.json(
        { error: "No active game session. Start the game first." },
        { status: 409 },
      );
    }

    const body: unknown = await request.json();
    const guess =
      body && typeof body === "object"
        ? (body as { lat?: unknown; lng?: unknown })
        : null;

    const result = lockGuess({
      game,
      session,
      guess: { lat: guess?.lat, lng: guess?.lng },
    });

    const response = NextResponse.json(result.response);
    const cookie = sessionCookieOptions();
    response.cookies.set(cookie.name, encodeSession(result.session), cookie);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to lock guess";

    if (message.startsWith("Game not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    if (message === "All guesses are already locked") {
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
