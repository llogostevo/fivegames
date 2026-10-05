"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

import { ClueFlowModal } from "@/components/game/ClueFlowModal";
import { FoundCelebration } from "@/components/game/FoundCelebration";
import { GameMap } from "@/components/game/GameMap";
import { HowToPlayModal } from "@/components/game/HowToPlayModal";
import { NextGameCountdown } from "@/components/game/NextGameCountdown";
import { ResultsPopup } from "@/components/game/ResultsPopup";
import { Pin5Mark } from "@/components/hub/Pin5Mark";
import {
  decisionScoreContext,
  getMapPlacementCopy,
  toDecisionFromFinishConfirm,
  toFinishConfirmState,
  type ClueFlowModalState,
} from "@/lib/game/clueFlow";
import { CLUE_COUNT } from "@/lib/game/constants";
import {
  markHoldTipSeen,
  readHoldTipSeen,
  shouldShowHoldTip,
} from "@/lib/game/holdTip";
import {
  DEFAULT_GAME_MODE,
  getModeDefinition,
  isFootballMode,
  modeApiPath,
  type GameMode,
} from "@/lib/game/modes";
import {
  getCurrentStreak,
  readPlayerHistory,
  recordCompletedReveal,
} from "@/lib/game/playerHistory";
import { getClueMaxScore } from "@/lib/game/scoring";
import {
  buildDailyShareText,
  buildWeeklyShareText,
  isWeeklyShareAvailable,
  shareText,
} from "@/lib/game/share";
import { getThemeOrDefault, type ThemeId } from "@/lib/game/themes";
import type { Coordinates } from "@/types/coordinates";
import type {
  CheckPinResponse,
  ContinueResponse,
  GameReveal,
  LockAnswerResponse,
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

const TEMPERATURE = {
  warmer: { emoji: "🔥", word: "Warmer", tone: "bg-warm-soft text-warm" },
  colder: { emoji: "🧊", word: "Colder", tone: "bg-cold-soft text-cold" },
  same: { emoji: "➡️", word: "Same", tone: "bg-neutral-100 text-foreground" },
} as const;

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

async function postCheckPin(coordinates: Coordinates, mode: GameMode) {
  const response = await fetch(modeApiPath("/api/game/check", mode), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(coordinates),
  });
  const data = (await response.json()) as CheckPinResponse & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(data.error ?? "Couldn't commit that pin.");
  }
  return data;
}

type GamePlayProps = {
  mode?: GameMode;
};

export function GamePlay({ mode = DEFAULT_GAME_MODE }: GamePlayProps) {
  const modeDef = getModeDefinition(mode);
  const [round] = useState(0);
  const [theme, setTheme] = useState<string>("");
  const [themeId, setThemeId] = useState<ThemeId | null>(null);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(
    null,
  );
  const [rows, setRows] = useState<ClueRow[]>([]);
  const [reveal, setReveal] = useState<GameReveal | null>(null);
  const [flowModal, setFlowModal] = useState<ClueFlowModalState | null>(null);
  /** One-shot celebration after a live FOUND; never set on resume. */
  const [foundCelebration, setFoundCelebration] = useState<GameReveal | null>(
    null,
  );
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
  const [showHoldTip, setShowHoldTip] = useState(() =>
    shouldShowHoldTip(readHoldTipSeen()),
  );

  useEffect(() => {
    let cancelled = false;

    async function startGame() {
      setIsStarting(true);
      setError(null);
      setUnavailableMessage(null);
      setHowToPlayOpen(false);
      setResultsOpen(false);

      try {
        const response = await fetch(modeApiPath("/api/game/start", mode), {
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
        setFlowModal(null);
        setShareStatus("idle");
        setWeekShareStatus("idle");

        if (data.complete && data.reveal) {
          // Server session already completed today's game — show results.
          // Do not replay FOUND celebration on resume.
          recordCompletedReveal(data.reveal);
          setReveal(data.reveal);
          setRows([]);
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

        // Committed pin awaiting Finish Here / Get Another Clue — restore decision.
        if (data.awaitingDecision) {
          setRows(rowsFromStart);
          const pinNumber = data.guesses.length;
          setFlowModal({
            type: "decision",
            pinNumber,
            ...decisionScoreContext(pinNumber, mode),
          });
          setHowToPlayOpen(false);
          setResultsOpen(false);
          return;
        }

        setRows(rowsFromStart);

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
  }, [round, mode]);

  const finishWithFoundReveal = useCallback((foundReveal: GameReveal) => {
    recordCompletedReveal(foundReveal);
    setReveal(foundReveal);
    setFlowModal(null);
    setShareStatus("idle");
    setWeekShareStatus("idle");
    setFoundCelebration(foundReveal);
    setResultsOpen(false);
  }, []);

  const handleCommitPin = useCallback(
    (coordinates: Coordinates) => {
      if (reveal || isBusy || foundCelebration) {
        return;
      }

      const activeRowIndex = rows.findIndex((row) => row.coordinates === null);
      if (activeRowIndex === -1) {
        return;
      }

      const currentPin = activeRowIndex + 1;

      // Successful press-and-hold — dismiss first-time tip for returning visits.
      markHoldTipSeen();
      setShowHoldTip(false);

      // Hold completed = pin committed. Show it immediately; server confirms.
      setRows((current) =>
        current.map((row, index) =>
          index === activeRowIndex ? { ...row, coordinates } : row,
        ),
      );
      setFlowModal(null);
      setIsBusy(true);
      setError(null);

      void (async () => {
        try {
          const check = await postCheckPin(coordinates, mode);

          if (check.found && check.reveal) {
            finishWithFoundReveal(check.reveal);
            return;
          }

          if (check.complete && check.reveal) {
            // Pin 5 not found — game complete, no decision modal.
            setFlowModal(null);
            recordCompletedReveal(check.reveal);
            setReveal(check.reveal);
            setShareStatus("idle");
            setWeekShareStatus("idle");
            setResultsOpen(true);
            return;
          }

          setFlowModal({
            type: "decision",
            pinNumber: currentPin,
            ...decisionScoreContext(currentPin, mode),
          });
        } catch (checkError) {
          // Roll back optimistic pin so the player can try again.
          setRows((current) =>
            current.map((row, index) =>
              index === activeRowIndex
                ? { ...row, coordinates: null }
                : row,
            ),
          );
          setError(
            `${checkError instanceof Error ? checkError.message : "Couldn't commit that pin."} Try again.`,
          );
        } finally {
          setIsBusy(false);
        }
      })();
    },
    [reveal, isBusy, foundCelebration, rows, finishWithFoundReveal, mode],
  );

  function handleRequestFinish() {
    // Confirmation only — pin is already committed; does not call the server.
    if (!flowModal || flowModal.type !== "decision") {
      return;
    }
    setFlowModal(toFinishConfirmState(flowModal));
  }

  function handleCancelFinish() {
    // Return to decision modal — committed pin cannot be moved.
    if (!flowModal || flowModal.type !== "finishConfirm") {
      return;
    }
    setFlowModal(toDecisionFromFinishConfirm(flowModal));
  }

  async function handleGetAnotherClue() {
    if (isBusy || reveal) {
      return;
    }

    const committedIndex = [...rows]
      .map((row, index) => (row.coordinates ? index : -1))
      .filter((index) => index >= 0)
      .pop();
    if (
      committedIndex === undefined ||
      committedIndex >= CLUE_COUNT - 1
    ) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      // Pin already committed — continue reveals warmer/colder + next clue.
      const continueResponse = await fetch(
        modeApiPath("/api/game/continue", mode),
        {
          method: "POST",
        },
      );
      const continueData = (await continueResponse.json()) as ContinueResponse & {
        error?: string;
      };

      if (!continueResponse.ok) {
        throw new Error(continueData.error ?? "Couldn't open the next clue.");
      }

      setRows((current) => [
        ...current.map((row, index) =>
          index === committedIndex
            ? { ...row, temperature: continueData.temperature }
            : row,
        ),
        {
          text: continueData.clue,
          coordinates: null,
          temperature: null,
        },
      ]);
      const nextClueNumber = continueData.clueIndex + 1;
      setFlowModal({
        type: "nextClue",
        temperature: continueData.temperature,
        clueNumber: nextClueNumber,
        clueText: continueData.clue,
        nextPinNumber: nextClueNumber,
        currentMaxScore: getClueMaxScore(nextClueNumber, modeDef.scoring),
      });
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : "Couldn't get the next clue.";
      setFlowModal({
        type: "error",
        message: `${message} Try again.`,
        retry: "getClue",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function handleFinishHere() {
    if (isBusy || reveal) {
      return;
    }

    if (!rows.some((row) => row.coordinates)) {
      return;
    }

    setIsBusy(true);
    setError(null);

    try {
      // Pin already committed — only complete via early lock.
      const answerResponse = await fetch(modeApiPath("/api/game/answer", mode), {
        method: "POST",
      });
      const answerData = (await answerResponse.json()) as LockAnswerResponse & {
        error?: string;
      };

      if (!answerResponse.ok) {
        throw new Error(answerData.error ?? "Couldn't lock your answer.");
      }

      if (answerData.reveal.foundLocation) {
        finishWithFoundReveal(answerData.reveal);
      } else {
        setFlowModal(null);
        recordCompletedReveal(answerData.reveal);
        setReveal(answerData.reveal);
        setShareStatus("idle");
        setWeekShareStatus("idle");
        setResultsOpen(true);
      }
    } catch (lockError) {
      const message =
        lockError instanceof Error
          ? lockError.message
          : "Couldn't lock your answer.";
      setFlowModal({
        type: "error",
        message: `${message} Try again.`,
        retry: "finish",
      });
    } finally {
      setIsBusy(false);
    }
  }

  function handlePlaceNextPin() {
    setFlowModal(null);
  }

  function handleFlowRetry() {
    if (!flowModal || flowModal.type !== "error") {
      return;
    }
    if (flowModal.retry === "getClue") {
      void handleGetAnotherClue();
      return;
    }
    void handleFinishHere();
  }

  async function handleShareScore() {
    if (!reveal) {
      return;
    }

    const history = readPlayerHistory(undefined, mode);
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

    const history = readPlayerHistory(undefined, mode);
    const streak = getCurrentStreak(history, reveal.date);
    const result = await shareText(
      buildWeeklyShareText({
        history,
        referenceDate: reveal.date,
        streak,
        mode,
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

  const isComplete = reveal !== null;
  const placingIndex = rows.findIndex((row) => row.coordinates === null);
  const modalOpen = flowModal !== null;
  const awaitingDecision =
    flowModal?.type === "decision" || flowModal?.type === "finishConfirm";
  // While a committed pin awaits a decision, show that clue (no null-coordinate row).
  const activeIndex =
    placingIndex >= 0
      ? placingIndex
      : awaitingDecision && rows.length > 0
        ? rows.length - 1
        : -1;
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : null;
  const pinNumber = activeIndex + 1;
  const lockedCount = rows.filter((row) => row.coordinates !== null).length;
  const lockedGuesses = rows.flatMap((row, index) =>
    row.coordinates ? [{ number: index + 1, coordinates: row.coordinates }] : [],
  );
  const currentPinNumber = Math.max(
    placingIndex >= 0 ? placingIndex + 1 : pinNumber,
    1,
  );
  const canPlacePin = placingIndex >= 0 && !awaitingDecision;
  const placementPrompt = getMapPlacementCopy({
    pinNumber: currentPinNumber,
    pinCommitted: !canPlacePin,
    modalOpen,
  });
  const mapInteractive =
    !isComplete &&
    !isBusy &&
    !isStarting &&
    !modalOpen &&
    canPlacePin;

  const actualDistances =
    reveal?.guesses.map((guess) => guess.distanceMeters) ?? [];
  const closestActualIndex = actualDistances.length
    ? actualDistances.indexOf(Math.min(...actualDistances))
    : -1;

  const mapGuesses =
    isComplete && reveal
      ? reveal.guesses.map((guess, index) => ({
          number: index + 1,
          coordinates: { lat: guess.lat, lng: guess.lng },
        }))
      : lockedGuesses;

  const liveClueMax = canPlacePin
    ? getClueMaxScore(currentPinNumber, modeDef.scoring)
    : awaitingDecision && pinNumber >= 1
      ? getClueMaxScore(pinNumber, modeDef.scoring)
      : null;

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
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md font-display text-2xl font-bold tracking-tight transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-course"
          >
            <Pin5Mark size="sm" className="h-8 w-8" />
            <span>Pin5</span>
          </Link>
          {isFootballMode(mode) ? (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-course/30 bg-course-soft px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-course sm:px-2 sm:text-[11px]"
              title={modeDef.chipLabel}
            >
              <span aria-hidden="true" className="text-[13px] leading-none tracking-normal">
                {modeDef.emoji}
              </span>
              <span>{modeDef.chipLabel}</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 rounded-md border border-rule bg-neutral-50 px-1.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/80 sm:px-2 sm:text-[11px]"
              title={modeDef.chipLabel}
            >
              <span aria-hidden="true" className="text-[13px] leading-none tracking-normal">
                {modeDef.emoji}
              </span>
              <span>{modeDef.chipLabel}</span>
            </span>
          )}
          {theme && mode === "daily" ? (
            <span className="hidden rounded-full bg-course-soft px-2.5 py-0.5 text-sm font-medium text-course sm:inline">
              {theme}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="rounded-md border border-[#c4157a] px-2.5 py-1.5 text-xs font-semibold text-[#c4157a] transition hover:bg-[#fbe7f2] sm:px-3 sm:text-sm"
          >
            More games
          </Link>
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
              const current =
                !isComplete &&
                (index === placingIndex ||
                  (placingIndex < 0 && awaitingDecision && index === activeIndex));
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

      <HowToPlayModal
        open={howToPlayOpen}
        primaryLabel={howToPlayCta}
        mode={mode}
        onClose={() => setHowToPlayOpen(false)}
      />

      {foundCelebration ? (
        <FoundCelebration
          reveal={foundCelebration}
          onComplete={() => {
            setFoundCelebration(null);
            setResultsOpen(true);
          }}
        />
      ) : null}

      <ClueFlowModal
        state={
          howToPlayOpen || resultsOpen || foundCelebration ? null : flowModal
        }
        isBusy={isBusy}
        onRequestFinish={handleRequestFinish}
        onConfirmFinish={() => void handleFinishHere()}
        onCancelFinish={handleCancelFinish}
        onGetAnotherClue={() => void handleGetAnotherClue()}
        onPlaceNextPin={handlePlaceNextPin}
        onRetry={handleFlowRetry}
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
                    {isFootballMode(mode)
                      ? "The club was"
                      : mode === "london-pubs"
                        ? "The pub was"
                        : mode === "london-stations"
                          ? "The station was"
                          : "The place was"}
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:mt-0 lg:text-5xl">
                    {reveal.answer.name}
                  </h2>
                  {reveal.answer.stadium || reveal.answer.city ? (
                    <p className="mt-1 text-sm text-muted">
                      {[reveal.answer.stadium, reveal.answer.city]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs font-semibold text-course sm:text-sm">
                    {reveal.foundLocation && reveal.foundOnPin
                      ? `🎯 Found on pin ${reveal.foundOnPin}`
                      : `Finished on pin ${reveal.lockedAfterClue}`}
                  </p>
                  <p className="mt-3 hidden text-sm font-medium uppercase tracking-[0.16em] text-muted lg:block">
                    Final score
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                    {reveal.totalScore.toLocaleString()}
                    <span className="text-base font-semibold text-muted sm:text-xl lg:text-2xl">
                      {" "}
                      / {reveal.maxScore.toLocaleString()}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted sm:text-sm">
                    Clue {reveal.lockedAfterClue} of {CLUE_COUNT} · Max{" "}
                    {reveal.clueMaximum.toLocaleString()}
                    {typeof reveal.finalDistanceMeters === "number"
                      ? ` · ${formatDistance(reveal.finalDistanceMeters)}`
                      : null}
                  </p>
                </div>
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
          ) : activeRow ? (
            <div key={activeIndex} className="fg-feedback space-y-2">
              <div>
                <p className="text-sm font-medium text-course">
                  Clue {pinNumber} of {CLUE_COUNT}
                  {liveClueMax !== null ? (
                    <span className="ml-2 font-normal text-muted">
                      · Max {liveClueMax.toLocaleString()}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 font-display text-xl font-semibold leading-snug sm:text-2xl lg:text-[1.7rem]">
                  {activeRow.text}
                </p>
              </div>

              {placementPrompt ? (
                <div aria-live="polite" className="space-y-0.5">
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    {placementPrompt.title}
                  </p>
                  <p className="text-xs text-muted sm:text-sm">
                    {placementPrompt.detail}
                  </p>
                </div>
              ) : null}
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
          key={`${mode}-${round}`}
          className={`relative w-full flex-1 overflow-hidden rounded-lg border border-rule bg-neutral-100 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:h-full lg:min-h-0 lg:flex-none ${
            isComplete ? "min-h-0" : "min-h-[50dvh]"
          }`}
          initialCenter={modeDef.mapStart.center}
          initialZoom={modeDef.mapStart.zoom}
          initialProjection={modeDef.mapStart.projection ?? "mercator"}
          gameMode
          showLabels={isComplete}
          interactive={mapInteractive}
          lockedGuesses={mapGuesses}
          target={reveal?.answer.coordinates ?? null}
          accentColor={activeTheme.accent}
          onCommit={handleCommitPin}
        >
          {showHoldTip && mapInteractive ? (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-[15] p-2.5 sm:p-3"
              role="status"
              aria-live="polite"
            >
              <div className="mx-auto max-w-sm rounded-lg border border-rule bg-background/95 px-3 py-2.5 shadow-md backdrop-blur-[2px]">
                <p className="font-display text-sm font-bold tracking-tight sm:text-base">
                  Press & hold to place your pin
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted sm:text-sm">
                  Keep holding until the circle fills. Once the pin drops, your
                  guess is locked in.
                </p>
              </div>
            </div>
          ) : null}
        </GameMap>

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
                const isClosest = isComplete && index === closestActualIndex;

                return (
                  <li key={index} className="flex items-start gap-3 py-3">
                    <PinBadge number={index + 1} state="locked" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        {row?.text ?? `Clue ${index + 1}`}
                      </p>
                      {revealedGuess?.isFinalAnswer ? (
                        <p className="mt-1 text-xs font-semibold text-course">
                          {reveal?.foundLocation
                            ? "🎯 Found here"
                            : "🎯 Finished here"}
                        </p>
                      ) : null}
                      {isComplete && typeof distance === "number" ? (
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span
                            className={`tabular-nums ${isClosest ? "font-semibold text-course" : "text-muted"}`}
                          >
                            {formatDistance(distance)}
                          </span>
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
