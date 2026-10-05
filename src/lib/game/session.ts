import { createHmac, timingSafeEqual } from "node:crypto";

import {
  GAME_SESSION_COOKIE,
  GAME_SESSION_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/game/constants";
import type { Guess } from "@/types/game";

/** Documented development-only fallback — never used in production. */
export const DEV_SESSION_SECRET_FALLBACK = "fivegames-dev-session-secret";

/** Minimum entropy for production session secrets (bytes as string length). */
export const MIN_PRODUCTION_SESSION_SECRET_LENGTH = 32;

export type GameSession = {
  gameId: string;
  /** Pins the player has actually locked. */
  guesses: Guess[];
  /** How many clue texts have been revealed to the player (1–5). */
  revealedClueCount: number;
  /**
   * When set, the game is complete.
   * Equals the clue number (1–5) on which they committed their final answer.
   */
  lockedAfterClue: number | null;
  /**
   * ISO timestamp when /start minted this session.
   * Proves the game was released at that instant (checked on later actions).
   */
  startedAt: string;
  /**
   * True when the game completed because a pin was within the FOUND radius.
   * Optional for backwards-compatible session cookies.
   */
  foundLocation?: boolean;
  /** Pin number (1–5) that found the location, when foundLocation is true. */
  foundOnPin?: number | null;
};

export class SessionSecretConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionSecretConfigError";
  }
}

export function getSessionSecret(options: { nodeEnv?: string } = {}): string {
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const configured = process.env.FIVEGAMES_SESSION_SECRET?.trim();

  if (nodeEnv === "production") {
    if (!configured) {
      throw new SessionSecretConfigError(
        "FIVEGAMES_SESSION_SECRET must be set in production.",
      );
    }
    if (configured.length < MIN_PRODUCTION_SESSION_SECRET_LENGTH) {
      throw new SessionSecretConfigError(
        `FIVEGAMES_SESSION_SECRET must be at least ${MIN_PRODUCTION_SESSION_SECRET_LENGTH} characters.`,
      );
    }
    if (configured === DEV_SESSION_SECRET_FALLBACK) {
      throw new SessionSecretConfigError(
        "FIVEGAMES_SESSION_SECRET must not use the development default value.",
      );
    }
    return configured;
  }

  return configured && configured.length > 0
    ? configured
    : DEV_SESSION_SECRET_FALLBACK;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeSession(session: GameSession): string {
  const secret = getSessionSecret();
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url",
  );
  return `${payload}.${sign(payload, secret)}`;
}

function isGuessArray(value: unknown): value is Guess[] {
  return (
    Array.isArray(value) &&
    value.every(
      (guess) =>
        typeof guess?.lat === "number" && typeof guess?.lng === "number",
    )
  );
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 10) {
    return false;
  }
  const time = Date.parse(value);
  return !Number.isNaN(time);
}

export function decodeSession(token: string | undefined): GameSession | null {
  if (!token) {
    return null;
  }

  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload, secret);
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

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const session = parsed as Partial<GameSession>;
    if (
      typeof session.gameId !== "string" ||
      !isGuessArray(session.guesses) ||
      !isIsoTimestamp(session.startedAt)
    ) {
      return null;
    }

    const revealedClueCount =
      typeof session.revealedClueCount === "number"
        ? session.revealedClueCount
        : Math.max(session.guesses.length, 1);

    const lockedAfterClue =
      typeof session.lockedAfterClue === "number"
        ? session.lockedAfterClue
        : null;

    if (
      !Number.isInteger(revealedClueCount) ||
      revealedClueCount < 1 ||
      revealedClueCount > 5
    ) {
      return null;
    }

    if (
      lockedAfterClue !== null &&
      (!Number.isInteger(lockedAfterClue) ||
        lockedAfterClue < 1 ||
        lockedAfterClue > 5)
    ) {
      return null;
    }

    if (session.guesses.length > revealedClueCount) {
      return null;
    }

    const foundLocation = session.foundLocation === true;
    let foundOnPin: number | null = null;
    if (
      foundLocation &&
      typeof session.foundOnPin === "number" &&
      Number.isInteger(session.foundOnPin) &&
      session.foundOnPin >= 1 &&
      session.foundOnPin <= 5
    ) {
      foundOnPin = session.foundOnPin;
    }

    return {
      gameId: session.gameId,
      guesses: session.guesses,
      revealedClueCount,
      lockedAfterClue,
      startedAt: session.startedAt,
      foundLocation,
      foundOnPin,
    };
  } catch {
    return null;
  }
}

export function createEmptySession(
  gameId: string,
  startedAt: Date = new Date(),
): GameSession {
  return {
    gameId,
    guesses: [],
    revealedClueCount: 1,
    lockedAfterClue: null,
    startedAt: startedAt.toISOString(),
    foundLocation: false,
    foundOnPin: null,
  };
}

export function sessionCookieOptions(
  maxAgeSeconds = GAME_SESSION_COOKIE_MAX_AGE_SECONDS,
) {
  return {
    name: GAME_SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}
