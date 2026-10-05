import { CLUE_COUNT } from "@/lib/game/constants";
import {
  DEFAULT_GAME_MODE,
  modeShareTitle,
  type GameMode,
} from "@/lib/game/modes";
import {
  formatStreakLabel,
  getWeeklyStats,
  maxWeeklyScoreForMode,
  type PlayerHistory,
  type WeeklyStats,
} from "@/lib/game/playerHistory";
import { WEEKLY_SHARE_BRAG_SCORE_THRESHOLD } from "@/lib/game/shareConfig";
import {
  getPin5WeekNumber,
  isWeeklyShareAvailable,
} from "@/lib/game/week";
import { shareUrlForMode } from "@/lib/site";
import type { GameReveal, RevealedGuess, TemperatureResult } from "@/types/game";

const TEMPERATURE_EMOJI: Record<TemperatureResult, string> = {
  warmer: "🔥",
  colder: "🧊",
  same: "➡️",
};

/** Build the emoji trail for actual pins only (final answer ends with 🎯). */
export function buildSharePinTrail(guesses: RevealedGuess[]): string {
  return guesses
    .map((guess, index) => {
      if (guess.isFinalAnswer) {
        return "🎯";
      }
      if (index === 0) {
        return "📍";
      }
      if (guess.temperature) {
        return TEMPERATURE_EMOJI[guess.temperature];
      }
      return "📍";
    })
    .join(" ");
}

/** Compact distance for share copy (no answer name). */
export function formatShareDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  if (meters < 10_000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  if (meters < 100_000) {
    return `${Math.round(meters / 1000)} km`;
  }
  return `${Math.round(meters / 1000).toLocaleString("en-GB")} km`;
}

export function getFinalPinDistanceMeters(
  reveal: GameReveal,
): number | null {
  const finalGuess = reveal.guesses.find((guess) => guess.isFinalAnswer);
  return typeof finalGuess?.distanceMeters === "number"
    ? finalGuess.distanceMeters
    : null;
}

/**
 * Beta daily share copy for a completed game.
 * Score / trail / lock / distance come from the server reveal; streak is local-only.
 */
function revealMode(reveal: GameReveal): GameMode {
  return reveal.mode ?? DEFAULT_GAME_MODE;
}

export function buildDailyShareText(reveal: GameReveal, streak = 0): string {
  const mode = revealMode(reveal);
  const title =
    mode === "daily"
      ? `PIN5 #${reveal.gameNumber} — ${reveal.theme}`
      : `${modeShareTitle(mode)} #${reveal.gameNumber}`;

  const lines = [
    title,
    `🎯 ${reveal.totalScore.toLocaleString("en-GB")} / ${reveal.maxScore.toLocaleString("en-GB")}`,
    buildSharePinTrail(reveal.guesses),
    `🔒 Locked on clue ${reveal.lockedAfterClue}/${CLUE_COUNT}`,
  ];

  const finalDistance = getFinalPinDistanceMeters(reveal);
  if (finalDistance !== null) {
    lines.push(`📍 ${formatShareDistance(finalDistance)} away`);
  }

  if (streak > 0) {
    lines.push(`🔥 ${formatStreakLabel(streak)}`);
  }

  lines.push("", "You can't beat me.", shareUrlForMode(mode));
  return lines.join("\n");
}

/** @deprecated Use buildDailyShareText */
export const buildShareText = buildDailyShareText;

export function countDaysPlayed(weekly: WeeklyStats): number {
  return weekly.days.filter((day) => day.status === "completed").length;
}

/** WhatsApp-friendly Mon–Sun completion pattern. */
export function buildWeeklyDayPattern(weekly: WeeklyStats): string {
  return weekly.days
    .map((day) => `${day.label} ${day.status === "completed" ? "✓" : "—"}`)
    .join(" · ");
}

export function weeklyShareBragLine(
  weeklyScore: number,
  daysPlayed: number,
  threshold: number = WEEKLY_SHARE_BRAG_SCORE_THRESHOLD,
): string {
  if (daysPlayed === 7 && weeklyScore >= threshold) {
    return "You can't beat my week.";
  }
  return "Can you beat my week?";
}

export type WeeklyShareInput = {
  history: PlayerHistory;
  /** Completed Sunday game date (or any date in the week — week is derived). */
  referenceDate: string;
  streak?: number;
  mode?: GameMode;
};

/**
 * Spoiler-free Monday–Sunday weekly share from validated local history.
 */
export function buildWeeklyShareText({
  history,
  referenceDate,
  streak = 0,
  mode = DEFAULT_GAME_MODE,
}: WeeklyShareInput): string {
  const weekly = getWeeklyStats(history, referenceDate, mode);
  const daysPlayed = countDaysPlayed(weekly);
  const weekNumber = getPin5WeekNumber(referenceDate);
  const weekTitle =
    mode === "daily"
      ? `PIN5 — WEEK ${weekNumber}`
      : `${modeShareTitle(mode)} — WEEK ${weekNumber}`;

  const lines = [
    weekTitle,
    `🏆 ${weekly.weeklyScore.toLocaleString("en-GB")} / ${maxWeeklyScoreForMode(mode).toLocaleString("en-GB")}`,
    `📅 ${daysPlayed}/7 played`,
    buildWeeklyDayPattern(weekly),
  ];

  if (streak > 0) {
    lines.push(`🔥 ${formatStreakLabel(streak)}`);
  }

  lines.push(
    "",
    weeklyShareBragLine(weekly.weeklyScore, daysPlayed),
    shareUrlForMode(mode),
  );

  return lines.join("\n");
}

export { isWeeklyShareAvailable };

export type ShareTextResult =
  | { status: "shared" }
  | { status: "copied" }
  | { status: "aborted" }
  | { status: "unsupported" }
  | { status: "error"; message: string };

/** Web Share API when available, otherwise clipboard copy. */
export async function shareText(text: string): Promise<ShareTextResult> {
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      await navigator.share({ text });
      return { status: "shared" };
    }

    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(text);
      return { status: "copied" };
    }

    return { status: "unsupported" };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { status: "aborted" };
    }
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Couldn't share that text.",
    };
  }
}
