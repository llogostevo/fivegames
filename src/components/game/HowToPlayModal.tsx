"use client";

import { useEffect, useId, useRef } from "react";

type HowToPlayModalProps = {
  open: boolean;
  onClose: () => void;
};

const STEPS = [
  {
    title: "Five clues, one place",
    body: "Each day hides a UK location. You get up to five clues that get more specific.",
  },
  {
    title: "Drop a pin",
    body: "Tap the map to place your guess, then Submit Guess to lock that pin.",
  },
  {
    title: "Warmer or colder",
    body: "From pin 2 onward you’ll hear if you’re closer or further than your last pin — not the exact distance.",
  },
  {
    title: "Continue or lock",
    body: "After each of the first four guesses, take the next clue or Lock Final Answer early.",
  },
  {
    title: "Score at the end",
    body: "Closer pins score more (up to 5,000 each, 25,000 total). Distances and points appear when you finish.",
  },
] as const;

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

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

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
        aria-label="Close how to play"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(88dvh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-t-2xl border border-rule bg-background shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
              Pin5 · UK Edition
            </p>
            <h2
              id={titleId}
              className="mt-1 font-display text-2xl font-bold tracking-tight"
            >
              How to play
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-md border border-rule px-2.5 py-1 text-sm font-semibold text-muted transition hover:bg-neutral-50 hover:text-foreground"
          >
            Close
          </button>
        </div>

        <ol className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-course-soft font-display text-sm font-bold text-course"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="border-t border-rule px-5 py-4">
          <p className="text-xs leading-relaxed text-muted">
            A new Pin5 drops every day at 08:00 UK time.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
