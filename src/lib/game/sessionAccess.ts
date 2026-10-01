import type { ClockOptions } from "@/lib/game/date";
import { isGameDateReleased, isValidIsoDate } from "@/lib/game/date";
import { GameNotFoundError, loadGame } from "@/lib/game/loadGame";
import type { GameSession } from "@/lib/game/session";
import type { GameDefinition } from "@/types/game";

/**
 * Trust model
 * -----------
 * START (/api/game/start):
 *   - Uses server clock only (production ignores all client overrides).
 *   - Loads getTodaysGame() = currently released date at 08:00 Europe/London.
 *   - Mints a signed session with { gameId, startedAt, progression }.
 *   - Clients never choose a gameId.
 *
 * CONTINUE (/guess, /continue, /answer):
 *   - Require a valid HMAC-signed session cookie (server secret).
 *   - Session.gameId is trusted only because the signature proves /start issued it.
 *   - Additionally: gameId must have been released at session.startedAt.
 *     This blocks forged-but-signed sessions that point at future JSON if the
 *     signing secret were ever weak, without breaking a player who started
 *     yesterday's game and finishes after today's 08:00 rollover.
 *   - loadGame(session.gameId) then proceeds; progression rules stay in evaluateGuess.
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

  try {
    return await loadGame(session.gameId);
  } catch (error) {
    if (error instanceof GameNotFoundError) {
      throw new SessionAccessError();
    }
    throw error;
  }
}
