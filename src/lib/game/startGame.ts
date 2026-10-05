import { CLUE_COUNT } from "@/lib/game/constants";
import type { ClockOptions } from "@/lib/game/date";
import { compareGuessTemperature } from "@/lib/game/distance";
import { getPublicGameMeta } from "@/lib/game/loadGame";
import { buildReveal } from "@/lib/game/reveal";
import {
  createEmptySession,
  type GameSession,
} from "@/lib/game/session";
import type {
  GameDefinition,
  PublicGameState,
  PublicLockedGuess,
  TemperatureResult,
} from "@/types/game";

export type StartGameResult = {
  session: GameSession;
  body: PublicGameState;
  /** True when a brand-new session was minted. */
  mintedNewSession: boolean;
};

/**
 * Public locked pins for resume.
 * Warmer/colder for a guess is only included after the player has continued
 * past it (Get Another Clue) — never while still awaiting that decision.
 */
function buildPublicGuesses(
  session: GameSession,
  game: GameDefinition,
): PublicLockedGuess[] {
  const target = { lat: game.answer.lat, lng: game.answer.lng };
  const gameComplete = session.lockedAfterClue !== null;

  return session.guesses.map((guess, index) => {
    let temperature: TemperatureResult | null = null;
    const temperatureEarned =
      gameComplete || session.revealedClueCount > index + 1;
    if (temperatureEarned && index > 0) {
      temperature = compareGuessTemperature(
        session.guesses[index - 1]!,
        guess,
        target,
      );
    }
    return {
      lat: guess.lat,
      lng: guess.lng,
      temperature,
    };
  });
}

function isAwaitingDecision(session: GameSession): boolean {
  return (
    session.lockedAfterClue === null &&
    session.guesses.length > 0 &&
    session.guesses.length === session.revealedClueCount &&
    session.guesses.length < CLUE_COUNT
  );
}

function currentClueIndex(session: GameSession): number {
  if (session.lockedAfterClue !== null) {
    return Math.max(session.lockedAfterClue - 1, 0);
  }
  if (isAwaitingDecision(session)) {
    return session.guesses.length - 1;
  }
  return Math.min(session.guesses.length, session.revealedClueCount - 1);
}

function buildInProgressBody(
  game: GameDefinition,
  session: GameSession,
  status: "new" | "resumed",
  now: Date,
  clockOptions: ClockOptions,
): PublicGameState {
  const clueIndex = currentClueIndex(session);
  const awaitingDecision = isAwaitingDecision(session);
  const clues = game.clues.slice(0, session.revealedClueCount);

  return {
    ...getPublicGameMeta(game, now, clockOptions),
    clueCount: CLUE_COUNT,
    status,
    clues,
    guesses: buildPublicGuesses(session, game),
    revealedClueCount: session.revealedClueCount,
    clueIndex,
    clue: clues[clueIndex] ?? null,
    awaitingDecision,
    canLockAnswer: awaitingDecision,
    lockedAfterClue: session.lockedAfterClue,
    complete: false,
    reveal: null,
  };
}

function buildCompletedBody(
  game: GameDefinition,
  session: GameSession,
  now: Date,
  clockOptions: ClockOptions,
): PublicGameState {
  const reveal = buildReveal(game, session, now, clockOptions);
  const clues = game.clues.slice(0, session.revealedClueCount);

  return {
    ...getPublicGameMeta(game, now, clockOptions),
    clueCount: CLUE_COUNT,
    status: "completed",
    clues,
    guesses: buildPublicGuesses(session, game),
    revealedClueCount: session.revealedClueCount,
    clueIndex: currentClueIndex(session),
    clue: null,
    awaitingDecision: false,
    canLockAnswer: false,
    lockedAfterClue: session.lockedAfterClue,
    complete: true,
    reveal,
  };
}

/**
 * Decide whether to mint a new session or resume an existing one for the
 * currently released daily game.
 *
 * - Same gameId + in progress → resume (no reset)
 * - Same gameId + complete → return server-built reveal
 * - Missing / other gameId / invalid → new session for today's game
 */
export function resolveStartGame(options: {
  game: GameDefinition;
  existingSession: GameSession | null;
  now?: Date;
  clockOptions?: ClockOptions;
}): StartGameResult {
  const { game, existingSession, now = new Date(), clockOptions = {} } =
    options;

  if (existingSession && existingSession.gameId === game.id) {
    if (existingSession.lockedAfterClue !== null) {
      return {
        session: existingSession,
        body: buildCompletedBody(game, existingSession, now, clockOptions),
        mintedNewSession: false,
      };
    }

    return {
      session: existingSession,
      body: buildInProgressBody(
        game,
        existingSession,
        "resumed",
        now,
        clockOptions,
      ),
      mintedNewSession: false,
    };
  }

  const session = createEmptySession(game.id, now);
  return {
    session,
    body: buildInProgressBody(game, session, "new", now, clockOptions),
    mintedNewSession: true,
  };
}
