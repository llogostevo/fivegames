"use client";

import type { TemperatureResult } from "@/types/game";

const COPY = {
  warmer: {
    emoji: "🔥",
    word: "Warmer",
    tone: "bg-warm text-white shadow-warm/30",
  },
  colder: {
    emoji: "🧊",
    word: "Colder",
    tone: "bg-cold text-white shadow-cold/30",
  },
  same: {
    emoji: "➡️",
    word: "Same",
    tone: "bg-foreground text-white shadow-foreground/20",
  },
} as const;

type TemperatureToastProps = {
  temperature: TemperatureResult | null;
  /** Bumps when a new toast should play (even if the word repeats). */
  toastKey: number;
};

export function TemperatureToast({
  temperature,
  toastKey,
}: TemperatureToastProps) {
  if (!temperature || toastKey <= 0) {
    return null;
  }

  const copy = COPY[temperature];

  return (
    <div
      key={toastKey}
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-live="assertive"
      role="status"
    >
      <div
        className={`fg-temp-toast flex items-center gap-3 rounded-2xl px-6 py-4 shadow-lg ${copy.tone}`}
      >
        <span aria-hidden="true" className="text-3xl leading-none">
          {copy.emoji}
        </span>
        <span className="font-display text-3xl font-bold tracking-tight uppercase sm:text-4xl">
          {copy.word}
        </span>
      </div>
    </div>
  );
}
