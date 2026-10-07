import type { ClockOptions } from "@/lib/game/date";
import { isGameDateReleased, isValidIsoDate } from "@/lib/game/date";
import {
  GameNotFoundError,
  getGameForModeByDate,
} from "@/lib/game/loadGame";
import { DEFAULT_GAME_MODE } from "@/lib/game/modes";
import { sessionMode, type GameSession } from "@/lib/game/session";
import type { GameDefinition } from "@/types/game";

/**
 * Trust model
 * -----------
 * START (/api/game/start?mode=…):
 *   - Uses server clock only (production ignores all client overrides).
 *   - Loads getTodaysGameForMode() = currently released date at 06:00 Europe/London.
 *   - Mints a signed session with { gameId, mode, startedAt, progression }.
 *   - Clients never choose a gameId.
 *   - Each mode has its own cookie so Daily and Football can coexist.
 *
 * CONTINUE (/guess, /continue, /answer, /check):
 *   - Require a valid HMAC-signed session cookie for the requested mode.
 *   - Session.gameId is trusted only because the signature proves /start issued it.
 *   - Session.mode must match the requested mode (blocks cookie/mode mismatch).
 *   - Additionally: gameId must have been released at session.startedAt.
 *     This blocks forged-but-signed sessions that point at future JSON if the
 *     signing secret were ever weak, without breaking a player who started
 *     yesterday's game and finishes after today's 06:00 rollover.
 *   - getGameForModeByDate(session.mode, session.gameId) then proceeds;
 *     progression rules stay in evaluateGuess.
 */

export class SessionAccessError extends Error {
  constructor(message = "No active game session. Start the game first.") {
    super(message);
    this.name = "SessionAccessError";
  }
}

/**
 * Load the game for a signed session after verifying release eligibility
 * at the session's start time.
 */
export async function loadGameForSession(
  session: GameSession,
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isValidIsoDate(session.gameId)) {
    throw new SessionAccessError();
  }

  const startedAt = new Date(session.startedAt);
  if (Number.isNaN(startedAt.getTime())) {
    throw new SessionAccessError();
  }

  // Reject sessions whose start time claims a game that was not yet released.
  if (!isGameDateReleased(session.gameId, startedAt, options)) {
    throw new SessionAccessError();
  }

  const mode = sessionMode(session);

  try {
    const game = await getGameForModeByDate(mode, session.gameId);
    const gameMode = game.mode ?? DEFAULT_GAME_MODE;
    if (gameMode !== mode) {
      throw new SessionAccessError();
    }
    return game;
  } catch (error) {
    if (error instanceof GameNotFoundError) {
      throw new SessionAccessError();
    }
    throw error;
  }
}
