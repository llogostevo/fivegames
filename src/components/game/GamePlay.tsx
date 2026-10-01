"use client";

import { useCallback, useEffect, useState } from "react";

import { GameMap } from "@/components/game/GameMap";
import { TEST_GAME_ID } from "@/lib/game/constants";
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

  return `${(meters / 1000).toFixed(1)} km`;
}

function temperatureLabel(temperature: TemperatureResult): string {
  if (temperature === "warmer") {
    return "WARMER";
  }
  if (temperature === "colder") {
    return "COLDER";
  }
  return "SAME";
}

function temperatureEmoji(temperature: TemperatureResult): string {
  if (temperature === "warmer") {
    return "🔥";
  }
  if (temperature === "colder") {
    return "🧊";
  }
  return "➡️";
}

export function GamePlay() {
  const [theme, setTheme] = useState<string>("");
  const [rows, setRows] = useState<ClueRow[]>([]);
  const [pendingGuess, setPendingGuess] = useState<Coordinates | null>(null);
  const [reveal, setReveal] = useState<GameReveal | null>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [isLocking, setIsLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          throw new Error(data.error ?? "Failed to start game");
        }

        if (cancelled) {
          return;
        }

        setTheme(data.theme);
        setPendingGuess(null);
        setReveal(null);
        setRows(
          data.clue
            ? [
                {
                  text: data.clue,
                  coordinates: null,
                  temperature: null,
                },
              ]
            : [],
        );
      } catch (startError) {
        if (!cancelled) {
          setError(
            startError instanceof Error
              ? startError.message
              : "Failed to start game",
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
  }, []);

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
        throw new Error(data.error ?? "Failed to lock guess");
      }

      setRows((current) => {
        const next = current.map((row, index) =>
          index === activeRowIndex
            ? {
                ...row,
                coordinates: pendingGuess,
                temperature: data.temperature,
              }
            : row,
        );

        if (!data.complete && data.nextClue) {
          next.push({
            text: data.nextClue,
            coordinates: null,
            temperature: null,
          });
        }

        return next;
      });
      setPendingGuess(null);

      if (data.complete && data.reveal) {
        setReveal(data.reveal);
      }
    } catch (lockError) {
      setError(
        lockError instanceof Error ? lockError.message : "Failed to lock guess",
      );
    } finally {
      setIsLocking(false);
    }
  }

  const isComplete = reveal !== null;
  const lockedGuesses = rows.flatMap((row, index) =>
    row.coordinates
      ? [{ number: index + 1, coordinates: row.coordinates }]
      : [],
  );
  const canLock = Boolean(pendingGuess) && !isLocking && !isComplete;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6 sm:py-10">
      <header className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          FiveGames
        </h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.2em] text-foreground/70">
          {theme || "…"}
        </p>
      </header>

      {isStarting ? (
        <p className="text-center text-sm text-foreground/60">Starting game…</p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {isComplete && reveal ? (
        <section className="space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-foreground/60">
            Answer
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {reveal.answer.name}
          </h2>
        </section>
      ) : null}

      <GameMap
        gameMode={!isComplete}
        interactive={!isComplete && !isLocking}
        pendingGuess={isComplete ? null : pendingGuess}
        lockedGuesses={lockedGuesses}
        target={reveal?.answer.coordinates ?? null}
        onSelect={handleSelect}
      />

      {!isComplete ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              void handleLockGuess();
            }}
            disabled={!canLock}
            className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            Lock Guess
          </button>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <section className="mx-auto w-full max-w-3xl">
          <ul className="divide-y divide-black/10 rounded-md border border-black/10">
            {rows.map((row, index) => {
              const isActive = row.coordinates === null && !isComplete;
              const distanceMeters = reveal?.guesses[index]?.distanceMeters;

              return (
                <li
                  key={`clue-row-${index + 1}`}
                  className={`flex items-center gap-3 px-4 py-3 text-sm ${
                    isActive ? "bg-neutral-50" : ""
                  }`}
                >
                  <span className="w-6 shrink-0 font-semibold text-foreground/50">
                    {index + 1}
                  </span>
                  <p className="min-w-0 flex-1 text-left leading-snug">
                    {row.text}
                  </p>
                  <div className="flex shrink-0 items-center gap-3 text-right">
                    {row.coordinates ? (
                      row.temperature ? (
                        <span className="font-semibold tracking-wide whitespace-nowrap">
                          <span aria-hidden="true">
                            {temperatureEmoji(row.temperature)}{" "}
                          </span>
                          {temperatureLabel(row.temperature)}
                        </span>
                      ) : (
                        <span className="text-foreground/40">—</span>
                      )
                    ) : null}
                    {typeof distanceMeters === "number" ? (
                      <span className="min-w-16 font-mono text-foreground/70">
                        {formatDistance(distanceMeters)}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
