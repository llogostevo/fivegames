import { createHmac, timingSafeEqual } from "node:crypto";

import { GAME_SESSION_COOKIE } from "@/lib/game/constants";
import type { Guess } from "@/types/game";

export type GameSession = {
  gameId: string;
  guesses: Guess[];
};

function sessionSecret(): string {
  return process.env.FIVEGAMES_SESSION_SECRET ?? "fivegames-dev-session-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function encodeSession(session: GameSession): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): GameSession | null {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );

    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as GameSession).gameId !== "string" ||
      !Array.isArray((parsed as GameSession).guesses)
    ) {
      return null;
    }

    const guesses = (parsed as GameSession).guesses;
    if (
      !guesses.every(
        (guess) =>
          typeof guess?.lat === "number" && typeof guess?.lng === "number",
      )
    ) {
      return null;
    }

    return {
      gameId: (parsed as GameSession).gameId,
      guesses,
    };
  } catch {
    return null;
  }
}

export function createEmptySession(gameId: string): GameSession {
  return { gameId, guesses: [] };
}

export function sessionCookieOptions(maxAgeSeconds = 60 * 60 * 6) {
  return {
    name: GAME_SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
