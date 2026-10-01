"use client";

import { useEffect, useState } from "react";

import { formatDailyReleaseBlurb } from "@/lib/game/dailyConfig";
import { formatCountdown } from "@/lib/game/date";

type NextGameCountdownProps = {
  nextReleaseAt: string;
  onPlayToday: () => void;
};

function remainingSeconds(nextReleaseAt: string, nowMs: number): number {
  const target = Date.parse(nextReleaseAt);
  if (Number.isNaN(target)) {
    return 0;
  }
  return Math.max(0, Math.ceil((target - nowMs) / 1000));
}

export function NextGameCountdown({
  nextReleaseAt,
  onPlayToday,
}: NextGameCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    remainingSeconds(nextReleaseAt, Date.now()),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft(remainingSeconds(nextReleaseAt, Date.now()));
    }, 1000);

    return () => window.clearInterval(id);
  }, [nextReleaseAt]);

  const available = secondsLeft <= 0;

  return (
    <div className="mt-4 border-t border-rule pt-3">
      {available ? (
        <>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            New game available
          </p>
          <button
            type="button"
            onClick={onPlayToday}
            className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Play today&apos;s FiveGames →
          </button>
        </>
      ) : (
        <>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Come back tomorrow
          </p>
          <p className="mt-1 text-xs text-muted">Next FiveGames in</p>
          <p
            className="mt-0.5 font-display text-xl font-bold tracking-tight tabular-nums sm:text-2xl"
            aria-live="polite"
          >
            {formatCountdown(secondsLeft)}
          </p>
          <p className="mt-1 text-xs text-muted">{formatDailyReleaseBlurb()}</p>
        </>
      )}
    </div>
  );
}
