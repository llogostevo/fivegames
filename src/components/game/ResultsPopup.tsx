"use client";

import { useEffect, useId, useRef, useState } from "react";

import { PlayerProgress } from "@/components/game/PlayerProgress";
import { formatDailyReleaseBlurb, formatReleaseTimeLabel } from "@/lib/game/dailyConfig";
import { formatCountdown } from "@/lib/game/date";
import {
  getCurrentStreak,
  getWeeklyStats,
  readPlayerHistory,
} from "@/lib/game/playerHistory";
import { THEMES, WEEKDAY_THEMES, type ThemeId } from "@/lib/game/themes";
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

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const WEEKDAY_LABELS: Record<(typeof WEEKDAY_ORDER)[number], string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  0: "Sun",
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

function themeLabel(themeId: ThemeId): string {
  return THEMES[themeId].label;
}

function CompactCountdown({ nextReleaseAt }: { nextReleaseAt: string }) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const target = Date.parse(nextReleaseAt);
    if (Number.isNaN(target)) {
      return 0;
    }
    return Math.max(0, Math.ceil((target - Date.now()) / 1000));
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      const target = Date.parse(nextReleaseAt);
      if (Number.isNaN(target)) {
        setSecondsLeft(0);
        return;
      }
      setSecondsLeft(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [nextReleaseAt]);

  if (secondsLeft <= 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
        Next Pin5 in
      </p>
      <p
        className="mt-0.5 font-display text-xl font-bold tracking-tight tabular-nums"
        aria-live="polite"
      >
        {formatCountdown(secondsLeft)}
      </p>
      <p className="mt-0.5 text-[11px] text-muted">{formatDailyReleaseBlurb()}</p>
    </div>
  );
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
  const [page, setPage] = useState<1 | 2>(1);

  const actualGuesses = reveal.guesses.filter((guess) => !guess.carriedForward);
  const actualDistances = actualGuesses.map(
    (guess) => guess.distanceMeters ?? Number.POSITIVE_INFINITY,
  );
  const closestIndex = actualDistances.length
    ? actualDistances.indexOf(Math.min(...actualDistances))
    : -1;
  const closestDistance =
    closestIndex >= 0 && Number.isFinite(actualDistances[closestIndex])
      ? actualDistances[closestIndex]
      : null;

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

  // History is written from GamePlay on server completion; read-only here.
  const history = readPlayerHistory();
  const weekly = getWeeklyStats(history, reveal.date);
  const streak = getCurrentStreak(history, reveal.date);

  const shareLabel =
    shareStatus === "copied"
      ? "Copied!"
      : shareStatus === "shared"
        ? "Shared!"
        : showWeeklyShare
          ? "Share today's result"
          : "Share score";

  const weekShareLabel =
    weekShareStatus === "copied"
      ? "Copied!"
      : weekShareStatus === "shared"
        ? "Shared!"
        : "Share my week";

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
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-rule bg-background shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
              Pin5 #{reveal.gameNumber} · {reveal.theme}
            </p>
            {page === 1 ? (
              <>
                <p className="mt-0.5 text-xs text-muted">The place was</p>
                <h2
                  id={titleId}
                  className="font-display text-2xl font-bold leading-tight tracking-tight"
                >
                  {reveal.answer.name}
                </h2>
              </>
            ) : (
              <h2
                id={titleId}
                className="mt-0.5 font-display text-xl font-bold leading-tight tracking-tight"
              >
                Come back tomorrow
              </h2>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rule text-lg leading-none text-muted transition hover:bg-neutral-50 hover:text-foreground"
            aria-label="Close and see the map"
            title="Close and see the map"
          >
            ×
          </button>
        </div>

        <div
          className="flex items-center justify-center gap-1.5 px-4 py-2"
          aria-label={`Results page ${page} of 2`}
        >
          <button
            type="button"
            onClick={() => setPage(1)}
            className={`h-1.5 rounded-full transition-all ${
              page === 1 ? "w-5 bg-course" : "w-1.5 bg-rule"
            }`}
            aria-label="Your score"
            aria-current={page === 1 ? "step" : undefined}
          />
          <button
            type="button"
            onClick={() => setPage(2)}
            className={`h-1.5 rounded-full transition-all ${
              page === 2 ? "w-5 bg-course" : "w-1.5 bg-rule"
            }`}
            aria-label="What’s next"
            aria-current={page === 2 ? "step" : undefined}
          />
        </div>

        <div className="px-4 pb-3">
          {page === 1 ? (
            <div className="space-y-2.5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                    Total score
                  </p>
                  <p className="font-display text-2xl font-bold tracking-tight">
                    {reveal.totalScore.toLocaleString()}
                    <span className="text-base font-semibold text-muted">
                      {" "}
                      / {reveal.maxScore.toLocaleString()}
                    </span>
                  </p>
                  {reveal.foundLocation && reveal.foundOnPin ? (
                    <p className="mt-1 text-xs font-semibold text-course">
                      🎯 Found on pin {reveal.foundOnPin}
                    </p>
                  ) : null}
                </div>
                {closestDistance !== null ? (
                  <p className="text-right text-xs text-muted">
                    Closest pin {closestIndex + 1}
                    <br />
                    <span className="font-semibold text-foreground">
                      {formatDistance(closestDistance)}
                    </span>
                  </p>
                ) : null}
              </div>

              <ol className="divide-y divide-rule rounded-lg border border-rule">
                {reveal.guesses.map((guess, index) => (
                  <li
                    key={index}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs tabular-nums ${
                      guess.carriedForward ? "bg-neutral-50 text-muted" : ""
                    }`}
                  >
                    <span className="font-display font-bold text-course">
                      Pin {index + 1}
                      {guess.carriedForward ? (
                        <span className="ml-1.5 text-[10px] font-medium text-muted">
                          carried
                        </span>
                      ) : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="w-12 text-right text-muted">
                        {typeof guess.distanceMeters === "number"
                          ? formatDistance(guess.distanceMeters)
                          : "—"}
                      </span>
                      <span className="w-14 text-right font-semibold text-foreground">
                        {guess.score.toLocaleString()}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>

              <PlayerProgress
                todayScore={reveal.totalScore}
                referenceDate={reveal.date}
                weekly={weekly}
                streak={streak}
              />

              <CompactCountdown
                key={reveal.nextReleaseAt}
                nextReleaseAt={reveal.nextReleaseAt}
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
                <h3 className="font-display text-sm font-semibold tracking-tight">
                  Come back each day
                </h3>
                <p className="mt-1 text-xs leading-snug text-muted">
                  One new UK place every day at {formatReleaseTimeLabel()} UK
                  time — a fresh set of five clues to find.
                </p>
              </div>

              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
                  Games this week
                </p>
                <ul className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {WEEKDAY_ORDER.map((day) => (
                    <li key={day} className="flex gap-1.5">
                      <span className="w-7 shrink-0 font-semibold text-foreground">
                        {WEEKDAY_LABELS[day]}
                      </span>
                      <span className="truncate text-muted">
                        {themeLabel(WEEKDAY_THEMES[day])}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-rule px-4 py-3">
          {page === 1 ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onShare}
                className="flex-1 rounded-md bg-course px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                {shareLabel}
              </button>
              <button
                type="button"
                onClick={() => setPage(2)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                What&apos;s next
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                className="rounded-md border border-rule px-3 py-2.5 text-sm font-semibold transition hover:bg-neutral-50"
              >
                ← Score
              </button>
              <button
                type="button"
                onClick={onShare}
                className="flex-1 rounded-md bg-course px-3 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                {shareLabel}
              </button>
            </div>
          )}
          {showWeeklyShare && onShareWeek ? (
            <button
              type="button"
              onClick={onShareWeek}
              className="w-full rounded-md border border-rule px-3 py-2.5 text-sm font-semibold transition hover:bg-neutral-50"
            >
              {weekShareLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
