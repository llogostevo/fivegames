"use client";

import { useEffect, useId, useRef } from "react";

import {
  HOW_TO_PLAY_STEPS,
  splitEmphasizedBody,
} from "@/lib/game/howToPlay";

type HowToPlayModalProps = {
  open: boolean;
  onClose: () => void;
  /** Primary CTA label — "Play now" on first visit, "Got it" from the header. */
  primaryLabel?: string;
};

function HoldDemo() {
  return (
    <div
      className="fg-hold-demo mt-2 flex items-center justify-center gap-2 rounded-md bg-neutral-50 px-2 py-2"
      aria-hidden="true"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        Press
      </span>
      <span className="text-muted" aria-hidden="true">
        →
      </span>
      <div className="fg-hold-demo-ring">
        <svg width="28" height="28" viewBox="0 0 56 56">
          <circle
            cx="28"
            cy="28"
            r="20"
            fill="none"
            stroke="rgba(30,30,36,0.12)"
            strokeWidth="5"
          />
          <circle
            className="fg-hold-demo-progress"
            cx="28"
            cy="28"
            r="20"
            fill="none"
            stroke="var(--course)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={125.6}
            transform="rotate(-90 28 28)"
          />
        </svg>
      </div>
      <span className="text-muted" aria-hidden="true">
        →
      </span>
      <span
        className="fg-hold-demo-pin flex h-6 w-6 items-center justify-center rounded-full border-[2.5px] border-course bg-white font-display text-[11px] font-bold text-course"
        aria-hidden="true"
      >
        📍
      </span>
    </div>
  );
}

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
          {HOW_TO_PLAY_STEPS.map((step, index) => {
            const parts = splitEmphasizedBody(step.body, step.emphasize);
            return (
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
                    {parts ? (
                      <>
                        {parts.before}
                        <strong className="font-semibold text-foreground">
                          {parts.emphasis}
                        </strong>
                        {parts.after}
                      </>
                    ) : (
                      step.body
                    )}
                  </p>
                  {step.showHoldDemo ? <HoldDemo /> : null}
                </div>
              </li>
            );
          })}
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
