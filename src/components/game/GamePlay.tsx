"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { GameMap } from "@/components/game/GameMap";
import { HowToPlayModal } from "@/components/game/HowToPlayModal";
import { NextGameCountdown } from "@/components/game/NextGameCountdown";
import { ResultsPopup } from "@/components/game/ResultsPopup";
import { TemperatureToast } from "@/components/game/TemperatureToast";
import { CLUE_COUNT } from "@/lib/game/constants";
import {
  getCurrentStreak,
  readPlayerHistory,
  recordCompletedReveal,
} from "@/lib/game/playerHistory";
import { getPanelActionState } from "@/lib/game/panelActions";
import {
  buildDailyShareText,
  buildWeeklyShareText,
  isWeeklyShareAvailable,
  shareText,
} from "@/lib/game/share";
import { getThemeOrDefault, type ThemeId } from "@/lib/game/themes";
import type { Coordinates } from "@/types/coordinates";
import type {
  ContinueResponse,
  GameReveal,
  LockAnswerResponse,
  LockGuessResponse,
  PublicGameState,
  TemperatureResult,
} from "@/types/game";

type ClueRow = {
  text: string;
  coordinates: Coordinates | null;
  temperature: TemperatureResult | null;
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

function formatPoints(points: number): string {
  return `${points.toLocaleString()} pts`;
}

const TEMPERATURE = {
  warmer: { emoji: "🔥", word: "Warmer", tone: "bg-warm-soft text-warm" },
  colder: { emoji: "🧊", word: "Colder", tone: "bg-cold-soft text-cold" },
  same: { emoji: "➡️", word: "Same", tone: "bg-neutral-100 text-foreground" },
} as const;

function feedbackSentence(temperature: TemperatureResult, pin: number) {
  if (temperature === "warmer") {
    return `Pin ${pin} is closer than pin ${pin - 1}.`;
  }
  if (temperature === "colder") {
    return `Pin ${pin} is further away than pin ${pin - 1}.`;
  }
  return `Pin ${pin} is about as far away as pin ${pin - 1}.`;
}

function PinBadge({
  number,
  state,
}: {
  number: number;
  state: "locked" | "active" | "upcoming" | "carried";
}) {
  const styles = {
    locked: "border-course text-course bg-white",
    active: "border-course bg-course text-white",
    upcoming: "border-rule text-muted bg-white",
    carried: "border-rule text-muted bg-neutral-50",
  }[state];
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[2.5px] font-display text-sm font-bold ${styles}`}
    >
      {number}
    </span>
  );
}

async function postGuess(pendingGuess: Coordinates) {
  const response = await fetch("/api/game/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pendingGuess),
  });
  const data = (await response.json()) as LockGuessResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "Your pin wasn't locked.");
  }
  return data;
}

export function GamePlay() {
  const [round] = useState(0);
  const [theme, setTheme] = useState<string>("");
  const [themeId, setThemeId] = useState<ThemeId | null>(null);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(
    null,
  );
  const [rows, setRows] = useState<ClueRow[]>([]);
  const [pendingGuess, setPendingGuess] = useState<Coordinates | null>(null);
  const [reveal, setReveal] = useState<GameReveal | null>(null);
  const [confirmingAnswer, setConfirmingAnswer] = useState(false);
  const [transitionTemperature, setTransitionTemperature] =
    useState<TemperatureResult | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "shared">(
    "idle",
  );
  const [weekShareStatus, setWeekShareStatus] = useState<
    "idle" | "copied" | "shared"
  >("idle");
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [howToPlayCta, setHowToPlayCta] = useState("Got it");
  const [resultsOpen, setResultsOpen] = useState(false);
  const [tempToast, setTempToast] = useState<TemperatureResult | null>(null);
  const [tempToastKey, setTempToastKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function startGame() {
      setIsStarting(true);
      setError(null);
      setUnavailableMessage(null);
      setHowToPlayOpen(false);
      setResultsOpen(false);

      try {
        const response = await fetch("/api/game/start", {
          method: "POST",
        });
        const data = (await response.json()) as PublicGameState & {
          error?: string;
        };

        if (!response.ok) {
          if (response.status === 404) {
            throw Object.assign(
              new Error(data.error ?? "Today's Pin5 isn't available yet."),
              { unavailable: true },
            );
          }
          throw new Error(data.error ?? "The game didn't start.");
        }
        if (cancelled) {
          return;
        }

        setTheme(data.theme);
        setThemeId(data.themeId);
        setPendingGuess(null);
        setConfirmingAnswer(false);
        setShareStatus("idle");
        setWeekShareStatus("idle");

        if (data.complete && data.reveal) {
          // Server session already completed today's game — show results.
          recordCompletedReveal(data.reveal);
          setReveal(data.reveal);
          setRows([]);
          setTransitionTemperature(null);
          setResultsOpen(true);
          setHowToPlayOpen(false);
          return;
        }

        // New or resumed in-progress game from the signed session.
        setReveal(null);
        const rowsFromStart: ClueRow[] = data.clues.map((text, index) => {
          const guess = data.guesses[index];
          return {
            text,
            coordinates: guess
              ? { lat: guess.lat, lng: guess.lng }
              : null,
            temperature: guess?.temperature ?? null,
          };
        });
        // Ensure the current active clue row exists even if clues array is short.
        if (
          rowsFromStart.length === 0 &&
          data.clue &&
          data.status === "new"
        ) {
          rowsFromStart.push({
            text: data.clue,
            coordinates: null,
            temperature: null,
          });
        }
        setRows(rowsFromStart);

        const latestTemperature =
          data.guesses.length > 0
            ? data.guesses[data.guesses.length - 1]?.temperature ?? null
            : null;
        setTransitionTemperature(latestTemperature);

        if (data.status === "new") {
          setHowToPlayCta("Play now");
          setHowToPlayOpen(true);
          setResultsOpen(false);
        } else {
          // Resumed in-progress — return to the board, no welcome modal.
          setHowToPlayOpen(false);
          setResultsOpen(false);
        }
      } catch (startError) {
        if (!cancelled) {
          const message =
            startError instanceof Error
              ? startError.message
              : "The game didn't start.";
          if (
            startError instanceof Error &&
            "unavailable" in startError &&
            startError.unavailable
          ) {
            setUnavailableMessage(message);
            setRows([]);
          } else {
            setError(`${message} Refresh the page to try again.`);
          }
        }
      } finally {
        if (!cancelled) {
          setIsStarting(false);
        }
      }
    }

    void startGame();

    return () => {
      cancelled = true;
    };
  }, [round]);

  const showTemperatureToast = useCallback((temperature: TemperatureResult | null) => {
    if (!temperature) {
      return;
    }
    setTempToast(temperature);
    setTempToastKey((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!tempToast || tempToastKey <= 0) {
      return;
    }
    const id = window.setTimeout(() => {
      setTempToast(null);
    }, 1700);
    return () => window.clearTimeout(id);
  }, [tempToast, tempToastKey]);

  const handleSelect = useCallback((coordinates: Coordinates) => {
    setPendingGuess(coordinates);
    setTransitionTemperature(null);
  }, []);

  async function handleGetNextClue() {
    if (!pendingGuess || isBusy || reveal || confirmingAnswer) {
      return;
    }

    const activeRowIndex = rows.findIndex((row) => row.coordinates === null);
    if (activeRowIndex === -1 || activeRowIndex >= CLUE_COUNT - 1) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const guessData = await postGuess(pendingGuess);

      setRows((current) =>
        current.map((row, index) =>
          index === activeRowIndex
            ? {
                ...row,
                coordinates: pendingGuess,
                temperature: guessData.temperature,
              }
            : row,
        ),
      );

      const continueResponse = await fetch("/api/game/continue", {
        method: "POST",
      });
      const continueData = (await continueResponse.json()) as ContinueResponse & {
        error?: string;
      };

      if (!continueResponse.ok) {
        throw new Error(continueData.error ?? "Couldn't open the next clue.");
      }

      setRows((current) => [
        ...current,
        {
          text: continueData.clue,
          coordinates: null,
          temperature: null,
        },
      ]);
      setPendingGuess(null);
      setTransitionTemperature(guessData.temperature);
      showTemperatureToast(guessData.temperature);
    } catch (nextError) {
      setError(
        `${nextError instanceof Error ? nextError.message : "Couldn't get the next clue."} Try again.`,
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSeeResult() {
    if (!pendingGuess || isBusy || reveal || confirmingAnswer) {
      return;
    }

    const activeRowIndex = rows.findIndex((row) => row.coordinates === null);
    if (activeRowIndex !== CLUE_COUNT - 1) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const guessData = await postGuess(pendingGuess);

      setRows((current) =>
        current.map((row, index) =>
          index === activeRowIndex
            ? {
                ...row,
                coordinates: pendingGuess,
                temperature: guessData.temperature,
              }
            : row,
        ),
      );
      setPendingGuess(null);
      setTransitionTemperature(null);

      if (guessData.complete && guessData.reveal) {
        recordCompletedReveal(guessData.reveal);
        setReveal(guessData.reveal);
        setShareStatus("idle");
        setWeekShareStatus("idle");
        setResultsOpen(true);
      } else {
        throw new Error("The final result didn't come back.");
      }
    } catch (resultError) {
      setError(
        `${resultError instanceof Error ? resultError.message : "Couldn't finish the game."} Try again.`,
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleShareScore() {
    if (!reveal) {
      return;
    }

    const history = readPlayerHistory();
    const streak = getCurrentStreak(history, reveal.date);
    const result = await shareText(buildDailyShareText(reveal, streak));

    if (result.status === "shared" || result.status === "copied") {
      setShareStatus(result.status);
      return;
    }
    if (result.status === "aborted") {
      return;
    }
    setError(
      result.status === "unsupported"
        ? "Sharing isn't available in this browser."
        : "Couldn't share your score. Try again.",
    );
  }

  async function handleShareWeek() {
    if (!reveal || !isWeeklyShareAvailable(reveal.date)) {
      return;
    }

    const history = readPlayerHistory();
    const streak = getCurrentStreak(history, reveal.date);
    const result = await shareText(
      buildWeeklyShareText({
        history,
        referenceDate: reveal.date,
        streak,
      }),
    );

    if (result.status === "shared" || result.status === "copied") {
      setWeekShareStatus(result.status);
      return;
    }
    if (result.status === "aborted") {
      return;
    }
    setError(
      result.status === "unsupported"
        ? "Sharing isn't available in this browser."
        : "Couldn't share your week. Try again.",
    );
  }

  async function handleConfirmFinalAnswer() {
    if (!pendingGuess || isBusy || reveal) {
      return;
    }

    const activeRowIndex = rows.findIndex((row) => row.coordinates === null);
    if (activeRowIndex === -1 || activeRowIndex >= CLUE_COUNT - 1) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      const guessData = await postGuess(pendingGuess);

      setRows((current) =>
        current.map((row, index) =>
          index === activeRowIndex
            ? {
                ...row,
                coordinates: pendingGuess,
                temperature: guessData.temperature,
              }
            : row,
        ),
      );

      const answerResponse = await fetch("/api/game/answer", {
        method: "POST",
      });
      const answerData = (await answerResponse.json()) as LockAnswerResponse & {
        error?: string;
      };

      if (!answerResponse.ok) {
        throw new Error(answerData.error ?? "Couldn't lock your answer.");
      }

      setPendingGuess(null);
      setConfirmingAnswer(false);
      setTransitionTemperature(null);
      recordCompletedReveal(answerData.reveal);
      setReveal(answerData.reveal);
      setShareStatus("idle");
      setWeekShareStatus("idle");
      setResultsOpen(true);
    } catch (answerError) {
      setError(
        `${answerError instanceof Error ? answerError.message : "Couldn't lock your answer."} Try again.`,
      );
    } finally {
      setIsBusy(false);
    }
  }

  const isComplete = reveal !== null;
  const activeIndex = rows.findIndex((row) => row.coordinates === null);
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : null;
  const pinNumber = activeIndex + 1;
  const lockedCount = rows.filter((row) => row.coordinates !== null).length;
  const lockedGuesses = rows.flatMap((row, index) =>
    row.coordinates ? [{ number: index + 1, coordinates: row.coordinates }] : [],
  );
  const hasPin = pendingGuess !== null;
  const panelActions = getPanelActionState({
    hasPin,
    clueNumber: Math.max(pinNumber, 1),
    isBusy,
    isComplete,
    isConfirming: confirmingAnswer,
  });
  const canAct = panelActions.canAct;
  const isFinalClue = panelActions.isFinalClue;

  const actualDistances =
    reveal?.guesses
      .filter((guess) => !guess.carriedForward)
      .map((guess) => guess.distanceMeters ?? Number.POSITIVE_INFINITY) ?? [];
  const closestActualIndex = actualDistances.length
    ? actualDistances.indexOf(Math.min(...actualDistances))
    : -1;

  const mapGuesses =
    isComplete && reveal
      ? reveal.guesses
          .filter((guess) => !guess.carriedForward)
          .map((guess, index) => ({
            number: index + 1,
            coordinates: { lat: guess.lat, lng: guess.lng },
          }))
      : lockedGuesses;

  const latestLockedIndex = lockedCount - 1;
  const latestLocked =
    !isComplete && latestLockedIndex >= 0 ? rows[latestLockedIndex] : null;

  const activeTheme = getThemeOrDefault(reveal?.themeId ?? themeId);
  const themeStyle = {
    "--course": activeTheme.accent,
    "--course-soft": activeTheme.accentSoft,
  } as CSSProperties;

  return (
    <div
      className={`flex flex-1 flex-col lg:h-dvh ${
        isComplete ? "h-dvh overflow-hidden" : "min-h-dvh"
      }`}
      style={themeStyle}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Pin5
          </h1>
          <span
            className="inline-flex items-center gap-1 rounded-md border border-rule bg-neutral-50 px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/80 sm:px-2 sm:text-[11px]"
            title="Pin5 UK Edition"
          >
            <span aria-hidden="true" className="text-[13px] leading-none tracking-normal">
              🇬🇧
            </span>
            <span>UK Edition</span>
          </span>
          {theme ? (
            <span className="hidden rounded-full bg-course-soft px-2.5 py-0.5 text-sm font-medium text-course sm:inline">
              {theme}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => {
              setHowToPlayCta("Got it");
              setHowToPlayOpen(true);
            }}
            className="rounded-md border border-rule px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-neutral-50 hover:text-foreground sm:px-3 sm:text-sm"
          >
            How to play
          </button>
          <ol
            className="flex items-center gap-1.5"
            aria-label={
              isComplete && reveal
                ? reveal.lockedAfterClue < CLUE_COUNT
                  ? `Answer locked on clue ${reveal.lockedAfterClue}`
                  : "Completed in 5 clues"
                : `Clue ${Math.max(pinNumber, 1)} of ${CLUE_COUNT}`
            }
          >
            {Array.from({ length: CLUE_COUNT }, (_, index) => {
              const done = index < lockedCount;
              const current = !isComplete && index === activeIndex;
              return (
                <li
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    current
                      ? "w-6 bg-course"
                      : done
                        ? "w-2 bg-course"
                        : "w-2 bg-rule"
                  }`}
                />
              );
            })}
          </ol>
        </div>
      </header>

      <TemperatureToast temperature={tempToast} toastKey={tempToastKey} />

      <HowToPlayModal
        open={howToPlayOpen}
        primaryLabel={howToPlayCta}
        onClose={() => setHowToPlayOpen(false)}
      />

      {reveal ? (
        <ResultsPopup
          key={`${reveal.gameId}-${resultsOpen ? "open" : "closed"}`}
          open={resultsOpen}
          reveal={reveal}
          shareStatus={shareStatus}
          weekShareStatus={weekShareStatus}
          showWeeklyShare={isWeeklyShareAvailable(reveal.date)}
          onClose={() => setResultsOpen(false)}
          onShare={() => void handleShareScore()}
          onShareWeek={() => void handleShareWeek()}
        />
      ) : null}

      <main className="flex flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-6 lg:gap-y-4 lg:p-6">
        <section className="shrink-0 lg:col-start-2 lg:row-start-1" aria-live="polite">
          {isStarting ? (
            <div className="space-y-3" aria-label="Loading the first clue">
              <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
              <div className="h-6 w-full animate-pulse rounded bg-neutral-100" />
              <div className="h-6 w-2/3 animate-pulse rounded bg-neutral-100" />
            </div>
          ) : unavailableMessage ? (
            <div className="fg-feedback">
              <h2 className="font-display text-2xl font-semibold leading-snug">
                {unavailableMessage}
              </h2>
            </div>
          ) : isComplete && reveal ? (
            <div className="fg-feedback">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted sm:text-sm">
                    Pin5 #{reveal.gameNumber} · {reveal.theme}
                  </p>
                  <p className="mt-2 hidden text-sm text-muted lg:block">
                    The place was
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:mt-0 lg:text-5xl">
                    {reveal.answer.name}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-course sm:text-sm">
                    {reveal.lockedAfterClue < CLUE_COUNT
                      ? `🎯 Answer locked on clue ${reveal.lockedAfterClue}`
                      : "Completed in 5 clues"}
                  </p>
                  <p className="mt-3 hidden text-sm font-medium uppercase tracking-[0.16em] text-muted lg:block">
                    Total score
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                    {reveal.totalScore.toLocaleString()}
                    <span className="text-base font-semibold text-muted sm:text-xl lg:text-2xl">
                      {" "}
                      / {reveal.maxScore.toLocaleString()}
                    </span>
                  </p>
                  {closestActualIndex >= 0 ? (
                    <p className="mt-1 text-xs text-muted sm:text-sm">
                      Closest pin: {closestActualIndex + 1} (
                      {formatDistance(actualDistances[closestActualIndex])})
                    </p>
                  ) : null}
                </div>

                <ol
                  className="shrink-0 space-y-1 pt-0.5 lg:hidden"
                  aria-label="Guess scores"
                >
                  {reveal.guesses.map((guess, index) => (
                    <li
                      key={index}
                      className={`flex items-center justify-end gap-2 text-sm tabular-nums ${
                        guess.carriedForward ? "text-muted" : "text-foreground"
                      }`}
                    >
                      <span className="w-4 text-right font-display font-bold text-course">
                        {index + 1}
                      </span>
                      <span className="w-14 text-right text-muted">
                        {typeof guess.distanceMeters === "number"
                          ? formatDistance(guess.distanceMeters)
                          : "—"}
                      </span>
                      <span className="w-[4.25rem] text-right font-semibold">
                        {guess.score.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setResultsOpen(true)}
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 sm:px-4 sm:py-2.5"
                >
                  View results
                </button>
                <button
                  type="button"
                  onClick={() => void handleShareScore()}
                  className="rounded-md bg-course px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 sm:px-4 sm:py-2.5"
                >
                  {shareStatus === "copied"
                    ? "Copied!"
                    : shareStatus === "shared"
                      ? "Shared!"
                      : isWeeklyShareAvailable(reveal.date)
                        ? "Share today's result"
                        : "Share score"}
                </button>
                {isWeeklyShareAvailable(reveal.date) ? (
                  <button
                    type="button"
                    onClick={() => void handleShareWeek()}
                    className="rounded-md border border-rule px-3 py-2 text-sm font-semibold transition hover:bg-neutral-50 sm:px-4 sm:py-2.5"
                  >
                    {weekShareStatus === "copied"
                      ? "Copied!"
                      : weekShareStatus === "shared"
                        ? "Shared!"
                        : "Share my week"}
                  </button>
                ) : null}
              </div>

              <NextGameCountdown
                key={reveal.nextReleaseAt}
                nextReleaseAt={reveal.nextReleaseAt}
              />
            </div>
          ) : confirmingAnswer ? (
            <div className="fg-feedback rounded-lg border border-rule p-4">
              <p className="font-display text-2xl font-semibold leading-snug">
                Lock this as your final answer?
              </p>
              <p className="mt-2 text-sm text-muted">
                You won&apos;t see the remaining clues. Your current location
                will count for the remaining rounds.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={isBusy || !hasPin}
                  onClick={() => void handleConfirmFinalAnswer()}
                  className="rounded-md bg-course px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  Lock Final Answer
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setConfirmingAnswer(false)}
                  className="rounded-md border border-rule px-4 py-2.5 text-sm font-semibold transition hover:bg-neutral-50 disabled:opacity-60"
                >
                  Keep Playing
                </button>
              </div>
            </div>
          ) : activeRow ? (
            <div key={activeIndex} className="fg-feedback space-y-3 lg:space-y-4">
              <div>
                <p className="text-sm font-medium text-course">
                  Clue {pinNumber} of {CLUE_COUNT}
                </p>
                <p className="mt-1 font-display text-xl font-semibold leading-snug sm:text-2xl lg:text-[1.7rem]">
                  {activeRow.text}
                </p>
              </div>

              {transitionTemperature ? (
                <p
                  className={`hidden items-center gap-2 rounded-md px-3 py-2 text-sm lg:flex ${TEMPERATURE[transitionTemperature].tone}`}
                >
                  <span aria-hidden="true" className="text-base">
                    {TEMPERATURE[transitionTemperature].emoji}
                  </span>
                  <span>
                    <strong className="font-semibold">
                      {TEMPERATURE[transitionTemperature].word}.
                    </strong>{" "}
                    {feedbackSentence(transitionTemperature, lockedCount)}
                  </span>
                </p>
              ) : null}

              {!hasPin ? (
                <p className="text-sm text-muted">Drop a pin on the map.</p>
              ) : null}

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={!canAct}
                  onClick={() =>
                    void (isFinalClue ? handleSeeResult() : handleGetNextClue())
                  }
                  className="rounded-md bg-course px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  {panelActions.primaryLabel}
                </button>
                {panelActions.secondaryLabel ? (
                  <button
                    type="button"
                    disabled={!canAct}
                    onClick={() => setConfirmingAnswer(true)}
                    className="rounded-md border border-course px-4 py-2.5 text-sm font-semibold text-course transition hover:bg-course-soft disabled:cursor-not-allowed disabled:border-rule disabled:text-muted disabled:hover:bg-transparent"
                  >
                    {panelActions.secondaryLabel}
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}
        </section>

        <GameMap
          key={round}
          className={`relative w-full flex-1 overflow-hidden rounded-lg border border-rule bg-neutral-100 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:h-full lg:min-h-0 lg:flex-none ${
            isComplete ? "min-h-0" : "min-h-[50dvh]"
          }`}
          gameMode
          showLabels={isComplete}
          interactive={!isComplete && !isBusy && !isStarting && !confirmingAnswer}
          pendingGuess={isComplete ? null : pendingGuess}
          pendingNumber={Math.max(pinNumber, 1)}
          lockedGuesses={mapGuesses}
          target={reveal?.answer.coordinates ?? null}
          accentColor={activeTheme.accent}
          onSelect={handleSelect}
        />

        {latestLocked ? (
          <section
            className="shrink-0 rounded-lg border border-rule px-3 py-2 lg:hidden"
            aria-label={`Guess ${latestLockedIndex + 1} feedback`}
            aria-live="polite"
          >
            <div className="flex items-center gap-3">
              <PinBadge number={latestLockedIndex + 1} state="locked" />
              {latestLocked.temperature ? (
                <p
                  className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold ${TEMPERATURE[latestLocked.temperature].tone}`}
                >
                  <span aria-hidden="true">
                    {TEMPERATURE[latestLocked.temperature].emoji}
                  </span>
                  <span className="uppercase tracking-wide">
                    {TEMPERATURE[latestLocked.temperature].word}
                  </span>
                </p>
              ) : (
                <p className="text-sm font-semibold uppercase tracking-wide text-muted">
                  Pin locked
                </p>
              )}
            </div>
          </section>
        ) : null}

        {rows.length > 0 || isComplete ? (
          <section
            className="hidden lg:col-start-2 lg:row-start-2 lg:block lg:min-h-0 lg:overflow-y-auto"
            aria-label="Clues and results"
          >
            <ol className="divide-y divide-rule border-y border-rule">
              {Array.from({ length: CLUE_COUNT }, (_, index) => {
                const row = rows[index];
                const revealedGuess = reveal?.guesses[index];
                const isActive = index === activeIndex && !isComplete;

                if (revealedGuess?.carriedForward) {
                  return (
                    <li
                      key={index}
                      className="flex items-start gap-3 py-2.5 text-sm text-muted"
                    >
                      <PinBadge number={index + 1} state="carried" />
                      <div className="min-w-0 flex-1">
                        <p className="leading-snug">
                          Final answer carried forward
                        </p>
                        <p className="mt-0.5 font-semibold tabular-nums text-foreground/70">
                          {formatPoints(revealedGuess.score)}
                        </p>
                      </div>
                    </li>
                  );
                }

                if (isActive && row) {
                  return (
                    <li key={index} className="flex items-start gap-3 py-3">
                      <PinBadge number={index + 1} state="active" />
                      <p className="min-w-0 flex-1 text-sm leading-snug">
                        {row.text}
                      </p>
                    </li>
                  );
                }

                if (!row && !revealedGuess) {
                  return (
                    <li
                      key={index}
                      className="flex items-start gap-3 py-3 opacity-50"
                    >
                      <PinBadge number={index + 1} state="upcoming" />
                      <p className="min-w-0 flex-1 text-sm leading-snug text-muted">
                        Locked
                      </p>
                    </li>
                  );
                }

                const temperature =
                  revealedGuess?.temperature ?? row?.temperature ?? null;
                const distance = revealedGuess?.distanceMeters;
                const score = revealedGuess?.score;
                const isClosest =
                  isComplete &&
                  !revealedGuess?.carriedForward &&
                  index === closestActualIndex;

                return (
                  <li key={index} className="flex items-start gap-3 py-3">
                    <PinBadge number={index + 1} state="locked" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        {row?.text ?? `Clue ${index + 1}`}
                      </p>
                      {revealedGuess?.isFinalAnswer &&
                      reveal &&
                      reveal.lockedAfterClue < CLUE_COUNT ? (
                        <p className="mt-1 text-xs font-semibold text-course">
                          🎯 Final answer
                        </p>
                      ) : null}
                      {isComplete && typeof distance === "number" ? (
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span
                            className={`tabular-nums ${isClosest ? "font-semibold text-course" : "text-muted"}`}
                          >
                            {formatDistance(distance)}
                          </span>
                          {typeof score === "number" ? (
                            <span className="font-semibold tabular-nums">
                              {formatPoints(score)}
                            </span>
                          ) : null}
                          {temperature ? (
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs font-semibold ${TEMPERATURE[temperature].tone}`}
                            >
                              <span aria-hidden="true">
                                {TEMPERATURE[temperature].emoji}{" "}
                              </span>
                              {TEMPERATURE[temperature].word}
                            </span>
                          ) : null}
                        </p>
                      ) : temperature ? (
                        <p className="mt-1">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-semibold ${TEMPERATURE[temperature].tone}`}
                          >
                            <span aria-hidden="true">
                              {TEMPERATURE[temperature].emoji}{" "}
                            </span>
                            {TEMPERATURE[temperature].word}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}
      </main>
    </div>
  );
}
