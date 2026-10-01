"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { GameMap } from "@/components/game/GameMap";
import { CLUE_COUNT, TEST_GAME_ID } from "@/lib/game/constants";
import type { Coordinates } from "@/types/coordinates";
import type {
  GameReveal,
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
  if (meters < 100_000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters / 1000).toLocaleString()} km`;
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
  state: "locked" | "active" | "upcoming";
}) {
  const styles = {
    locked: "border-course text-course bg-white",
    active: "border-course bg-course text-white",
    upcoming: "border-rule text-muted bg-white",
  }[state];
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-[2.5px] font-display text-sm font-bold ${styles}`}
    >
      {number}
    </span>
  );
}

export function GamePlay() {
  const [round, setRound] = useState(0);
  const [theme, setTheme] = useState<string>("");
  const [rows, setRows] = useState<ClueRow[]>([]);
  const [pendingGuess, setPendingGuess] = useState<Coordinates | null>(null);
  const [reveal, setReveal] = useState<GameReveal | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startGame() {
      setIsStarting(true);
      setError(null);

      try {
        const response = await fetch(`/api/game/${TEST_GAME_ID}/start`, {
          method: "POST",
        });
        const data = (await response.json()) as PublicGameState & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "The game didn't start.");
        }
        if (cancelled) {
          return;
        }

        setTheme(data.theme);
        setPendingGuess(null);
        setReveal(null);
        setCopied(false);
        setRows(
          data.clue
            ? [{ text: data.clue, coordinates: null, temperature: null }]
            : [],
        );
      } catch (startError) {
        if (!cancelled) {
          setError(
            `${startError instanceof Error ? startError.message : "The game didn't start."} Refresh the page to try again.`,
          );
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

  const handleSelect = useCallback((coordinates: Coordinates) => {
    setPendingGuess(coordinates);
  }, []);

  async function handleLockGuess() {
    if (!pendingGuess || isLocking || reveal) {
      return;
    }

    const activeRowIndex = rows.findIndex((row) => row.coordinates === null);
    if (activeRowIndex === -1) {
      return;
    }

    setIsLocking(true);
    setError(null);

    try {
      const response = await fetch(`/api/game/${TEST_GAME_ID}/guess`, {
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

      setRows((current) => {
        const next = current.map((row, index) =>
          index === activeRowIndex
            ? { ...row, coordinates: pendingGuess, temperature: data.temperature }
            : row,
        );
        if (!data.complete && data.nextClue) {
          next.push({ text: data.nextClue, coordinates: null, temperature: null });
        }
        return next;
      });
      setPendingGuess(null);

      if (data.complete && data.reveal) {
        setReveal(data.reveal);
      }
    } catch (lockError) {
      setError(
        `${lockError instanceof Error ? lockError.message : "Your pin wasn't locked."} Try locking it again.`,
      );
    } finally {
      setIsLocking(false);
    }
  }

  // Enter locks the pin on keyboards.
  const lockRef = useRef(handleLockGuess);
  useEffect(() => {
    lockRef.current = handleLockGuess;
  });
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.repeat) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea")) {
        return;
      }
      void lockRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isComplete = reveal !== null;
  const activeIndex = rows.findIndex((row) => row.coordinates === null);
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : null;
  const pinNumber = activeIndex + 1;
  const lockedRows = rows.filter((row) => row.coordinates !== null);
  const lockedCount = lockedRows.length;
  const lastLocked = lockedRows[lockedCount - 1];
  const lockedGuesses = rows.flatMap((row, index) =>
    row.coordinates ? [{ number: index + 1, coordinates: row.coordinates }] : [],
  );
  const canLock = Boolean(pendingGuess) && !isLocking && !isComplete;
  const isFinalPin = pinNumber === CLUE_COUNT;

  const distances = reveal?.guesses.map((guess) => guess.distanceMeters) ?? [];
  const closestIndex = distances.length
    ? distances.indexOf(Math.min(...distances))
    : -1;

  async function handleShare() {
    if (!reveal) {
      return;
    }
    const trail = rows
      .map((row, index) =>
        index === 0 ? "📍" : row.temperature ? TEMPERATURE[row.temperature].emoji : "",
      )
      .join("");
    const text = [
      `FiveGames: ${theme}`,
      trail,
      `Closest pin: ${formatDistance(distances[closestIndex])}`,
      window.location.origin,
    ].join("\n");

    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed; nothing to do.
    }
  }

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:h-dvh">
      <header className="flex items-center justify-between gap-4 border-b border-rule px-4 py-3 sm:px-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            FiveGames
          </h1>
          {theme ? (
            <span className="rounded-full bg-course-soft px-2.5 py-0.5 text-sm font-medium text-course">
              {theme}
            </span>
          ) : null}
        </div>
        <ol
          className="flex items-center gap-1.5"
          aria-label={
            isComplete
              ? "All five pins placed"
              : `Pin ${Math.max(pinNumber, 1)} of ${CLUE_COUNT}`
          }
        >
          {Array.from({ length: CLUE_COUNT }, (_, index) => {
            const done = index < lockedCount;
            const current = index === activeIndex && !isComplete;
            return (
              <li
                key={index}
                className={`h-2 rounded-full transition-all ${
                  current ? "w-6 bg-course" : done ? "w-2 bg-course" : "w-2 bg-rule"
                }`}
              />
            );
          })}
        </ol>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 sm:p-6 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-6">
        {/* Current clue or result */}
        <section className="lg:col-start-2 lg:row-start-1" aria-live="polite">
          {isStarting ? (
            <div className="space-y-3" aria-label="Loading the first clue">
              <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
              <div className="h-6 w-full animate-pulse rounded bg-neutral-100" />
              <div className="h-6 w-2/3 animate-pulse rounded bg-neutral-100" />
            </div>
          ) : isComplete && reveal ? (
            <div className="fg-feedback">
              <p className="text-sm text-muted">The place was</p>
              <h2 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                {reveal.answer.name}
              </h2>
              <p className="mt-2 text-base">
                Your closest was pin {closestIndex + 1},{" "}
                <strong className="font-semibold">
                  {formatDistance(distances[closestIndex])}
                </strong>{" "}
                away.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="rounded-md bg-course px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  {copied ? "Copied to clipboard" : "Share result"}
                </button>
                <button
                  type="button"
                  onClick={() => setRound((value) => value + 1)}
                  className="rounded-md border border-rule px-4 py-2.5 text-sm font-semibold transition hover:bg-neutral-50"
                >
                  Play again
                </button>
              </div>
            </div>
          ) : activeRow ? (
            <div key={activeIndex} className="fg-feedback">
              <p className="text-sm font-medium text-course">
                Clue {pinNumber} of {CLUE_COUNT}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold leading-snug sm:text-[1.7rem]">
                {activeRow.text}
              </p>

              {lastLocked ? (
                lastLocked.temperature ? (
                  <p
                    className={`mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${TEMPERATURE[lastLocked.temperature].tone}`}
                  >
                    <span aria-hidden="true" className="text-base">
                      {TEMPERATURE[lastLocked.temperature].emoji}
                    </span>
                    <span>
                      <strong className="font-semibold">
                        {TEMPERATURE[lastLocked.temperature].word}.
                      </strong>{" "}
                      {feedbackSentence(lastLocked.temperature, lockedCount)}
                    </span>
                  </p>
                ) : (
                  <p className="mt-3 rounded-md bg-neutral-100 px-3 py-2 text-sm text-muted">
                    Pin 1 is down. From now on, each pin tells you if you&apos;re
                    warmer or colder than the one before.
                  </p>
                )
              ) : (
                <p className="mt-3 text-sm text-muted">
                  Each clue narrows it down. Drop a pin where you think the
                  place is. You get five pins, one per clue.
                </p>
              )}
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

        {/* Map */}
        <GameMap
          key={round}
          className="relative h-[58dvh] min-h-80 w-full overflow-hidden rounded-lg border border-rule bg-neutral-100 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:h-full"
          gameMode
          showLabels={isComplete}
          interactive={!isComplete && !isLocking && !isStarting}
          pendingGuess={isComplete ? null : pendingGuess}
          pendingNumber={pinNumber}
          lockedGuesses={lockedGuesses}
          target={reveal?.answer.coordinates ?? null}
          onSelect={handleSelect}
        >
          {!isComplete && !isStarting ? (
            <>
              {!pendingGuess ? (
                <p className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/95 px-3 py-1.5 text-sm font-medium shadow-sm">
                  Tap the map to place pin {pinNumber}
                </p>
              ) : null}
              <div className="pointer-events-none absolute inset-x-0 bottom-8 flex flex-col items-center gap-1.5 px-4">
                <button
                  type="button"
                  onClick={() => void handleLockGuess()}
                  disabled={!canLock}
                  className="pointer-events-auto rounded-full bg-course px-6 py-3 font-display text-lg font-bold text-white shadow-lg transition hover:brightness-110 disabled:bg-white disabled:text-muted disabled:shadow-md"
                >
                  {isFinalPin ? "Lock final pin" : `Lock pin ${pinNumber}`}
                </button>
                {pendingGuess ? (
                  <p className="hidden rounded bg-white/90 px-2 py-0.5 text-xs text-muted sm:block">
                    Drag the pin to adjust, or press Enter to lock
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </GameMap>

        {/* Clue trail */}
        {rows.length > 0 ? (
          <section
            className="lg:col-start-2 lg:row-start-2 lg:overflow-y-auto"
            aria-label="Clues so far"
          >
            <ol className="divide-y divide-rule border-y border-rule">
              {Array.from({ length: CLUE_COUNT }, (_, index) => {
                const row = rows[index];
                const isActive = index === activeIndex && !isComplete;
                if (isActive && !isComplete) {
                  return null;
                }
                const distance = reveal?.guesses[index]?.distanceMeters;
                const isClosest = isComplete && index === closestIndex;
                return (
                  <li
                    key={index}
                    className={`flex items-start gap-3 py-3 ${row ? "" : "opacity-60"}`}
                  >
                    <PinBadge number={index + 1} state={row ? "locked" : "upcoming"} />
                    <p className="min-w-0 flex-1 text-sm leading-snug">
                      {row ? row.text : "Unlocks after the pin before it"}
                    </p>
                    <div className="flex shrink-0 flex-col items-end gap-0.5 text-sm">
                      {row?.temperature ? (
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-semibold ${TEMPERATURE[row.temperature].tone}`}
                        >
                          <span aria-hidden="true">
                            {TEMPERATURE[row.temperature].emoji}{" "}
                          </span>
                          {TEMPERATURE[row.temperature].word}
                        </span>
                      ) : null}
                      {typeof distance === "number" ? (
                        <span
                          className={`tabular-nums ${isClosest ? "font-semibold text-course" : "text-muted"}`}
                        >
                          {formatDistance(distance)}
                        </span>
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
