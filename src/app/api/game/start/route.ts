import { NextResponse } from "next/server";

import { CLUE_COUNT } from "@/lib/game/constants";
import {
  GameNotFoundError,
  getPublicGameMeta,
  getTodaysGame,
  missingGameDeveloperMessage,
  missingGamePlayerMessage,
} from "@/lib/game/loadGame";
import {
  createEmptySession,
  encodeSession,
  sessionCookieOptions,
} from "@/lib/game/session";
import type { PublicGameState } from "@/types/game";

export async function POST() {
  try {
    const game = await getTodaysGame();
    const session = createEmptySession(game.id);
    const token = encodeSession(session);
    const cookie = sessionCookieOptions();

    const body: PublicGameState = {
      ...getPublicGameMeta(game),
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

    const message =
      error instanceof Error ? error.message : "Failed to start game";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
