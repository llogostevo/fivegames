"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import { getCampaignRefForEvents } from "@/lib/analytics/visitor";
import { trackPlayAnother } from "@/lib/analytics/track";
import {
  collectionOutcomeFromReveal,
  formatCollectionCountsLine,
  getCollectionCounts,
} from "@/lib/game/collection";
import {
  DEFAULT_GAME_MODE,
  getModeDefinition,
  isFootballMode,
  listPlayableModes,
  modePath,
  type GameMode,
  type GameModeDefinition,
} from "@/lib/game/modes";
import {
  formatStreakLabel,
  getCurrentStreak,
  getWeeklyStats,
  readPlayerHistory,
  type WeeklyStats,
} from "@/lib/game/playerHistory";
import type { GameReveal } from "@/types/game";

type ResultsPopupProps = {
  open: boolean;
  reveal: GameReveal;
  shareStatus: "idle" | "copied" | "shared";
  weekShareStatus?: "idle" | "copied" | "shared";
  /** True after completing the Sunday game for the current week. */
  showWeeklyShare?: boolean;
  onClose: () => void;
  onShare: () => void;
  onShareWeek?: () => void;
};

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} m`;
  }
  if (meters < 10_000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  if (meters < 100_000) {
    return `${Math.round(meters / 1000)} km`;
  }
  return `${Math.round(meters / 1000).toLocaleString()} km`;
}

function modeLabel(mode: GameMode): string {
  return getModeDefinition(mode).modeLabel;
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3v10m0-10 3.5 3.5M12 3 8.5 6.5M6 11v7.5A2.5 2.5 0 0 0 8.5 21h7a2.5 2.5 0 0 0 2.5-2.5V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 6.2 4.8 8.5 9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function dayTitle(day: WeeklyStats["days"][number]): string {
  const weekday = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][day.weekdayIndex]!;

  if (day.score !== null) {
    return `${weekday} — ${day.score.toLocaleString()} points`;
  }
  if (day.status === "today") {
    return `${weekday} — today`;
  }
  if (day.status === "future") {
    return `${weekday} — upcoming`;
  }
  return `${weekday} — not completed`;
}

function modeRowLabel(def: GameModeDefinition): string {
  return def.family === "football" ||
    def.family === "world" ||
    def.family === "pubs" ||
    def.family === "stations" ||
    def.family === "uk-stations" ||
    def.family === "airports" ||
    def.family === "taylor-swift" ||
    def.family === "harry-potter" ||
    def.family === "marvel" ||
    def.family === "star-wars"
    ? `${def.title.replace(" 5", "")} · ${def.subtitle}`
    : def.title;
}

function modeRowHint(def: GameModeDefinition): string {
  if (def.family === "football") {
    return "5 clues · find today's home ground";
  }
  if (def.family === "world") {
    return "5 clues · find today's place anywhere";
  }
  if (def.family === "airports") {
    return "5 clues · find today's airport";
  }
  if (def.family === "pubs") {
    return "5 clues · find today's London pub";
  }
  if (def.family === "stations") {
    return "5 clues · find today's London station";
  }
  if (def.family === "uk-stations") {
    return "5 clues · find today's National Rail station";
  }
  if (def.family === "taylor-swift") {
    return "5 clues · find today's Taylor Swift place";
  }
  if (def.family === "harry-potter") {
    return "5 clues · find today's Wizarding World place";
  }
  if (def.family === "marvel") {
    return "5 clues · find today's Marvel place";
  }
  if (def.family === "star-wars") {
    return "5 clues · find today's Star Wars place";
  }
  return "5 clues · one UK place";
}

function pickOtherMode(current: GameMode, played: Set<GameMode>): GameMode {
  const unplayed = listPlayableModes().find(
    (def) => def.id !== current && !played.has(def.id),
  );
  if (unplayed) {
    return unplayed.id;
  }
  // Prefer another football league, then daily.
  const otherFootball = listPlayableModes().find(
    (def) => def.family === "football" && def.id !== current,
  );
  if (otherFootball) {
    return otherFootball.id;
  }
  return current === "daily" ? "football" : "daily";
}

export function ResultsPopup({
  open,
  reveal,
  shareStatus,
  weekShareStatus = "idle",
  showWeeklyShare = false,
  onClose,
  onShare,
  onShareWeek,
}: ResultsPopupProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const actualDistances = reveal.guesses.map((guess) => guess.distanceMeters);
  const closestIndex = actualDistances.length
    ? actualDistances.indexOf(Math.min(...actualDistances))
    : -1;
  const closestDistance =
    closestIndex >= 0 ? actualDistances[closestIndex]! : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const mode = reveal.mode ?? DEFAULT_GAME_MODE;
  const modeHistory = readPlayerHistory(undefined, mode);
  const weekly = getWeeklyStats(modeHistory, reveal.date, mode);
  const streak = getCurrentStreak(modeHistory, reveal.date);

  const playable = listPlayableModes();
  const modeStatuses = playable.map((def) => {
    const history = readPlayerHistory(undefined, def.id);
    const played =
      def.id === mode || Boolean(history.games[reveal.date]);
    const score =
      def.id === mode
        ? reveal.totalScore
        : (history.games[reveal.date]?.score ?? null);
    return { def, played, score };
  });
  const playedModes = new Set(
    modeStatuses.filter((row) => row.played).map((row) => row.def.id),
  );
  const playedCount = playedModes.size;
  const totalModes = playable.length;
  const otherPending = playedCount < totalModes;

  const shareLabel =
    shareStatus === "copied"
      ? "Copied!"
      : shareStatus === "shared"
        ? "Shared!"
        : "Share today's result";

  const weekShareLabel =
    weekShareStatus === "copied"
      ? "Copied!"
      : weekShareStatus === "shared"
        ? "Shared!"
        : "or share my week";

  const resultLine = (() => {
    if (reveal.foundLocation && reveal.foundOnPin) {
      const distance =
        typeof reveal.finalDistanceMeters === "number"
          ? formatDistance(reveal.finalDistanceMeters)
          : null;
      const place = isFootballMode(mode) ? "from the ground" : "away";
      return distance
        ? `Found on pin ${reveal.foundOnPin} · ${distance} ${place}`
        : `Found on pin ${reveal.foundOnPin}`;
    }
    if (closestIndex >= 0 && closestDistance !== null) {
      return `Closest: pin ${closestIndex + 1} · ${formatDistance(closestDistance)}`;
    }
    return `Finished on pin ${reveal.lockedAfterClue}`;
  })();

  const collectionOutcome = collectionOutcomeFromReveal(reveal);
  const collectionCounts = getCollectionCounts(mode);
  const collectionMessage =
    collectionOutcome === "bagged"
      ? "🎯 Bagged! You found it on clue 1."
      : collectionOutcome === "found"
        ? "Found! Get it on clue 1 to bag it."
        : null;

  const subtitle = [reveal.answer.stadium, reveal.answer.city]
    .filter(Boolean)
    .join(" · ");

  const otherMode = pickOtherMode(mode, playedModes);
  const otherDef = getModeDefinition(otherMode);
  const otherGame = {
    href: modePath(otherMode),
    label:
      otherDef.family === "football" ||
      otherDef.family === "world" ||
      otherDef.family === "pubs" ||
      otherDef.family === "stations" ||
      otherDef.family === "uk-stations" ||
      otherDef.family === "airports" ||
      otherDef.family === "taylor-swift" ||
      otherDef.family === "harry-potter" ||
      otherDef.family === "marvel" ||
      otherDef.family === "star-wars"
        ? `Play ${otherDef.title} · ${otherDef.subtitle}`
        : `Play ${otherDef.title}`,
  };

  // World first, then airports, Daily UK, London editions, Music, Film, then football.
  const orderedStatuses = [
    ...modeStatuses.filter((row) => row.def.family === "world"),
    ...modeStatuses.filter((row) => row.def.family === "airports"),
    ...modeStatuses.filter((row) => row.def.family === "daily"),
    ...modeStatuses.filter((row) => row.def.family === "pubs"),
    ...modeStatuses.filter((row) => row.def.family === "stations"),
    ...modeStatuses.filter((row) => row.def.family === "uk-stations"),
    ...modeStatuses.filter((row) => row.def.family === "taylor-swift"),
    ...modeStatuses.filter((row) => row.def.family === "harry-potter"),
    ...modeStatuses.filter((row) => row.def.family === "marvel"),
    ...modeStatuses.filter((row) => row.def.family === "star-wars"),
    ...modeStatuses.filter((row) => row.def.family === "football"),
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/45 backdrop-blur-[2px]"
        aria-label="Close results"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(92dvh,40rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-rule bg-background shadow-xl"
      >
        <div className="overflow-y-auto px-4 pb-4 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
                PIN5 #{reveal.gameNumber} · {modeLabel(mode)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {isFootballMode(mode)
                  ? "The club was"
                  : mode === "london-pubs"
                    ? "The pub was"
                    : mode === "london-stations" || mode === "uk-stations"
                      ? "The station was"
                      : mode === "world-airports"
                        ? "The airport was"
                        : mode === "taylor-swift"
                          ? "The place was"
                          : "The place was"}
              </p>
              <h2
                id={titleId}
                className="mt-0.5 font-display text-[2rem] font-bold leading-none tracking-tight"
              >
                {reveal.answer.name}
              </h2>
              {subtitle ? (
                <p className="mt-1.5 text-xs text-muted">{subtitle}</p>
              ) : null}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rule text-xl leading-none text-muted transition hover:bg-neutral-50 hover:text-foreground"
              aria-label="Close"
              title="Close"
            >
              ×
            </button>
          </div>

          <div className="mt-5">
            <p className="font-display text-[2rem] font-bold leading-none tracking-tight tabular-nums">
              {reveal.totalScore.toLocaleString()}
              <span className="align-baseline text-base font-semibold text-muted">
                {" "}
                / {reveal.maxScore.toLocaleString()}
              </span>
            </p>
            <p className="mt-1.5 text-xs text-muted">{resultLine}</p>
            {collectionMessage ? (
              <p className="mt-2 text-sm font-semibold text-course">
                {collectionMessage}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted">
              {formatCollectionCountsLine(collectionCounts)}
              {" · "}
              <Link
                href="/collection"
                className="font-semibold text-course transition hover:brightness-90"
              >
                Your collection
              </Link>
            </p>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={onShare}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-course text-base font-semibold text-white transition hover:brightness-110"
            >
              <ShareIcon />
              {shareLabel}
            </button>
            {showWeeklyShare && onShareWeek ? (
              <button
                type="button"
                onClick={onShareWeek}
                className="mt-2 w-full py-1 text-center text-sm font-semibold text-course transition hover:brightness-90"
              >
                {weekShareLabel}
              </button>
            ) : null}
          </div>

          <section
            className="mt-5 rounded-xl bg-course-soft px-3.5 py-3.5"
            aria-label="Today's Pin5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-xs font-semibold text-foreground/80">
                Today&apos;s Pin5
              </h3>
              <p className="text-xs text-muted">
                {playedCount} of {totalModes} played
              </p>
            </div>

            <ul className="mt-3 space-y-1">
              {orderedStatuses.map(({ def, played, score }) => (
                <li key={def.id}>
                  <Link
                    href={modePath(def.id)}
                    onClick={() => {
                      if (def.id !== mode) {
                        trackPlayAnother({
                          fromGame: mode,
                          toGame: def.id,
                          campaignRef: getCampaignRefForEvents(),
                        });
                      }
                    }}
                    className="flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 transition hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-course"
                    aria-label={
                      played && score !== null
                        ? `${modeRowLabel(def)}, scored ${score.toLocaleString()}, open game`
                        : `${modeRowLabel(def)}, not played yet, open game`
                    }
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        played
                          ? "bg-course text-white"
                          : "border border-dashed border-rule bg-white text-transparent"
                      }`}
                      aria-hidden="true"
                    >
                      {played ? <CheckIcon /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {modeRowLabel(def)}
                        </p>
                        {score !== null ? (
                          <p className="text-sm font-semibold tabular-nums">
                            {score.toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                      {!played ? (
                        <p className="text-xs text-muted">{modeRowHint(def)}</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {otherPending ? (
              <Link
                href={otherGame.href}
                onClick={() => {
                  trackPlayAnother({
                    fromGame: mode,
                    toGame: otherMode,
                    campaignRef: getCampaignRefForEvents(),
                  });
                }}
                className="mt-3.5 flex h-12 w-full items-center justify-center rounded-xl bg-neutral-900 text-sm font-semibold text-white transition hover:brightness-110"
              >
                {otherGame.label}
                <span aria-hidden="true" className="ml-1.5">
                  →
                </span>
              </Link>
            ) : (
              <p className="mt-3.5 text-center text-xs font-medium text-foreground/70">
                All games played today
              </p>
            )}
          </section>

          <section
            className="mt-3 rounded-xl bg-neutral-50 px-3.5 py-3.5"
            aria-label="This week"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                This week
              </h3>
              {streak > 0 ? (
                <p className="text-xs font-semibold text-foreground">
                  {formatStreakLabel(streak)}
                </p>
              ) : null}
            </div>
            <p className="mt-1 font-display text-2xl font-bold tracking-tight tabular-nums">
              {weekly.weeklyScore.toLocaleString()}
              <span className="text-sm font-semibold text-muted">
                {" "}
                / {weekly.maxWeeklyScore.toLocaleString()}
              </span>
            </p>
            <ol
              className="mt-3 flex items-center justify-between gap-1"
              aria-label="Weekly completions Monday to Sunday"
            >
              {weekly.days.map((day) => {
                const filled = day.status === "completed";
                const isToday = day.date === reveal.date;
                return (
                  <li
                    key={day.date}
                    className="flex flex-1 flex-col items-center gap-0.5"
                  >
                    <span className="text-[10px] font-semibold text-muted">
                      {day.label}
                    </span>
                    <span
                      title={dayTitle(day)}
                      aria-label={dayTitle(day)}
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold leading-none ${
                        filled
                          ? "border-course bg-course text-white"
                          : isToday
                            ? "border-course bg-course-soft text-course"
                            : day.status === "missed"
                              ? "border-rule bg-white text-muted"
                              : "border-dashed border-rule bg-white text-muted/60"
                      }`}
                    >
                      {filled ? <CheckIcon /> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
