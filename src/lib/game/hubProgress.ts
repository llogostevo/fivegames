import { getAvailableGameDate } from "@/lib/game/date";
import {
  listPlayableModes,
  type GameMode,
  type GameModeDefinition,
} from "@/lib/game/modes";
import {
  formatStreakLabel,
  getCurrentStreak,
  readPlayerHistory,
  type PlayerHistoryGame,
} from "@/lib/game/playerHistory";

export type ModeHubProgress = {
  mode: GameMode;
  def: GameModeDefinition;
  playedToday: boolean;
  todayScore: number | null;
  streak: number;
  streakLabel: string | null;
  todayRecord: PlayerHistoryGame | null;
};

export type HubProgressSnapshot = {
  /** Currently released calendar game date (Europe/London release rules). */
  availableGameDate: string;
  modes: ModeHubProgress[];
  playedTodayCount: number;
  totalModes: number;
};

/**
 * Read-only composite of each mode's local history for the hub / cross-sell UI.
 * Does not merge stores — each mode stays independent.
 *
 * Pass `availableGameDate` from the server (release + dev-date aware) so the
 * hub matches the date games were actually completed under.
 */
export function emptyHubProgress(
  availableGameDate?: string,
  now: Date = new Date(),
): HubProgressSnapshot {
  const date =
    availableGameDate ?? getAvailableGameDate(now, { now });
  const playable = listPlayableModes();
  return {
    availableGameDate: date,
    modes: playable.map((def) => ({
      mode: def.id,
      def,
      playedToday: false,
      todayScore: null,
      streak: 0,
      streakLabel: null,
      todayRecord: null,
    })),
    playedTodayCount: 0,
    totalModes: playable.length,
  };
}

export function readHubProgress(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
  options: {
    now?: Date;
    /** Prefer the server-resolved release date when provided. */
    availableGameDate?: string;
  } = {},
): HubProgressSnapshot {
  const now = options.now ?? new Date();
  const availableGameDate =
    options.availableGameDate ?? getAvailableGameDate(now, { now });
  const playable = listPlayableModes();

  const modes: ModeHubProgress[] = playable.map((def) => {
    const history = readPlayerHistory(storage, def.id);
    const todayRecord = history.games[availableGameDate] ?? null;
    const streak = getCurrentStreak(history, availableGameDate);
    return {
      mode: def.id,
      def,
      playedToday: Boolean(todayRecord),
      todayScore: todayRecord?.score ?? null,
      streak,
      streakLabel: streak > 0 ? formatStreakLabel(streak) : null,
      todayRecord,
    };
  });

  return {
    availableGameDate,
    modes,
    playedTodayCount: modes.filter((row) => row.playedToday).length,
    totalModes: modes.length,
  };
}

export function hubProgressForMode(
  snapshot: HubProgressSnapshot,
  mode: GameMode,
): ModeHubProgress | null {
  return snapshot.modes.find((row) => row.mode === mode) ?? null;
}
