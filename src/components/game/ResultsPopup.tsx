"use client";

import { useEffect, useId, useRef, useState } from "react";

import { NextGameCountdown } from "@/components/game/NextGameCountdown";
import { formatReleaseTimeLabel } from "@/lib/game/dailyConfig";
import { THEMES, WEEKDAY_THEMES, type ThemeId } from "@/lib/game/themes";
import type { GameReveal } from "@/types/game";

type ResultsPopupProps = {
  open: boolean;
  reveal: GameReveal;
  shareStatus: "idle" | "copied" | "shared";
  onClose: () => void;
  onShare: () => void;
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

export function ResultsPopup({
  open,
  reveal,
  shareStatus,
  onClose,
  onShare,
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

    setPage(1);
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

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
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
        className="relative z-10 flex max-h-[min(92dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-rule bg-background shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
              Pin5 #{reveal.gameNumber} · {reveal.theme}
            </p>
            {page === 1 ? (
              <>
                <p className="mt-1 text-sm text-muted">The place was</p>
                <h2
                  id={titleId}
                  className="font-display text-3xl font-bold leading-tight tracking-tight"
                >
                  {reveal.answer.name}
                </h2>
              </>
            ) : (
              <h2
                id={titleId}
                className="mt-1 font-display text-2xl font-bold leading-tight tracking-tight"
              >
                Come back tomorrow
              </h2>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rule text-lg leading-none text-muted transition hover:bg-neutral-50 hover:text-foreground"
            aria-label="Close and see the map"
            title="Close and see the map"
          >
            ×
          </button>
        </div>

        <div
          className="flex items-center justify-center gap-1.5 px-5 pb-3"
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {page === 1 ? (
            <div className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                    Total score
                  </p>
                  <p className="mt-0.5 font-display text-3xl font-bold tracking-tight">
                    {reveal.totalScore.toLocaleString()}
                    <span className="text-lg font-semibold text-muted">
                      {" "}
                      / {reveal.maxScore.toLocaleString()}
                    </span>
                  </p>
                </div>
                {closestDistance !== null ? (
                  <p className="text-right text-sm text-muted">
                    Closest pin {closestIndex + 1}
                    <br />
                    <span className="font-semibold text-foreground">
                      {formatDistance(closestDistance)}
                    </span>
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                  Score on each pin
                </p>
                <ol className="mt-2 divide-y divide-rule rounded-lg border border-rule">
                  {reveal.guesses.map((guess, index) => (
                    <li
                      key={index}
                      className={`flex items-center justify-between gap-3 px-3 py-2 text-sm tabular-nums ${
                        guess.carriedForward ? "bg-neutral-50 text-muted" : ""
                      }`}
                    >
                      <span className="font-display font-bold text-course">
                        Pin {index + 1}
                        {guess.carriedForward ? (
                          <span className="ml-2 text-xs font-medium text-muted">
                            carried
                          </span>
                        ) : null}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="w-16 text-right text-muted">
                          {typeof guess.distanceMeters === "number"
                            ? formatDistance(guess.distanceMeters)
                            : "—"}
                        </span>
                        <span className="w-[4.5rem] text-right font-semibold text-foreground">
                          {guess.score.toLocaleString()} pts
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <NextGameCountdown
                key={reveal.nextReleaseAt}
                nextReleaseAt={reveal.nextReleaseAt}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-neutral-50 px-3 py-3">
                <h3 className="font-display text-sm font-semibold tracking-tight">
                  Come back each day
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Pin5 is a daily game — one new UK place every day. A fresh
                  puzzle drops at {formatReleaseTimeLabel()} UK time. Come back
                  tomorrow for a new set of five clues and a new location to
                  find.
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
                  Games this week
                </p>
                <ul className="mt-2 divide-y divide-rule rounded-lg border border-rule">
                  {WEEKDAY_ORDER.map((day) => (
                    <li
                      key={day}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-foreground">
                        {WEEKDAY_LABELS[day]}
                      </span>
                      <span className="text-muted">
                        {themeLabel(WEEKDAY_THEMES[day])}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          )}
        </div>

        <div className="border-t border-rule px-5 py-4">
          {page === 1 ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onShare}
                className="flex-1 rounded-md bg-course px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                {shareStatus === "copied"
                  ? "Copied!"
                  : shareStatus === "shared"
                    ? "Shared!"
                    : "Share score"}
              </button>
              <button
                type="button"
                onClick={() => setPage(2)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
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
                className="rounded-md border border-rule px-4 py-2.5 text-sm font-semibold transition hover:bg-neutral-50"
              >
                ← Score
              </button>
              <button
                type="button"
                onClick={onShare}
                className="flex-1 rounded-md bg-course px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
              >
                {shareStatus === "copied"
                  ? "Copied!"
                  : shareStatus === "shared"
                    ? "Shared!"
                    : "Share score"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
