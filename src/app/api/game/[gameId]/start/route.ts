import { NextResponse } from "next/server";

import { CLUE_COUNT } from "@/lib/game/constants";
import { loadGame } from "@/lib/game/loadGame";
import {
  createEmptySession,
  encodeSession,
  sessionCookieOptions,
} from "@/lib/game/session";
import type { PublicGameState } from "@/types/game";

type RouteContext = {
  params: Promise<{ gameId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { gameId } = await context.params;
    const game = await loadGame(gameId);
    const session = createEmptySession(game.id);
    const token = encodeSession(session);
    const cookie = sessionCookieOptions();

    const body: PublicGameState = {
      gameId: game.id,
      theme: game.theme,
      clueCount: CLUE_COUNT,
      clueIndex: 0,
      clue: game.clues[0],
      complete: false,
      reveal: null,
    };

    const response = NextResponse.json(body);
    response.cookies.set(cookie.name, token, cookie);
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start game";
    const status = message.startsWith("Game not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
