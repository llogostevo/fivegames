"use client";

import { useEffect, useId, useRef } from "react";

type HowToPlayModalProps = {
  open: boolean;
  onClose: () => void;
  /** Primary CTA label — "Play now" on first visit, "Got it" from the header. */
  primaryLabel?: string;
};

const STEPS = [
  {
    title: "Five clues, one place",
    body: "Each day hides a UK location. Clues get more specific.",
  },
  {
    title: "Drop a pin",
    body: "Tap the map, then Submit Guess to lock it.",
  },
  {
    title: "Warmer or colder",
    body: "From pin 2, see if you’re closer — not the exact distance.",
  },
  {
    title: "Continue or lock",
    body: "Take the next clue, or Lock Final Answer early.",
  },
  {
    title: "Score at the end",
    body: "Up to 5,000 per pin, 25,000 total. Distances show when you finish.",
  },
] as const;

export function HowToPlayModal({
  open,
  onClose,
  primaryLabel = "Got it",
}: HowToPlayModalProps) {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-rule bg-background shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 px-4 pb-1 pt-4">
          <h2
            id={titleId}
            className="font-display text-xl font-bold tracking-tight"
          >
            How to play
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-rule text-lg leading-none text-muted transition hover:bg-neutral-50 hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <ol className="space-y-2.5 px-4 py-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-2.5">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-course-soft font-display text-xs font-bold text-course"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-sm font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-0.5 text-xs leading-snug text-muted">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <div className="px-4 pb-4 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md bg-course px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
