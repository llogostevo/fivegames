"use client";

import { useEffect, useState } from "react";

import { formatDailyReleaseBlurb } from "@/lib/game/dailyConfig";
import { formatCountdown } from "@/lib/game/date";

type NextGameCountdownProps = {
  nextReleaseAt: string;
};

function remainingSeconds(nextReleaseAt: string, nowMs: number): number {
  const target = Date.parse(nextReleaseAt);
  if (Number.isNaN(target)) {
    return 0;
  }
  return Math.max(0, Math.ceil((target - nowMs) / 1000));
}

export function NextGameCountdown({ nextReleaseAt }: NextGameCountdownProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    remainingSeconds(nextReleaseAt, Date.now()),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft(remainingSeconds(nextReleaseAt, Date.now()));
    }, 1000);

    return () => window.clearInterval(id);
  }, [nextReleaseAt]);

  if (secondsLeft <= 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-rule pt-3">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
        Come back tomorrow
      </p>
      <p className="mt-1 text-xs text-muted">Next Pin5 in</p>
      <p
        className="mt-0.5 font-display text-xl font-bold tracking-tight tabular-nums sm:text-2xl"
        aria-live="polite"
      >
        {formatCountdown(secondsLeft)}
      </p>
      <p className="mt-1 text-xs text-muted">{formatDailyReleaseBlurb()}</p>
    </div>
  );
}
