"use client";

import { useEffect, useId, useRef } from "react";

import {
  lockConfirmExplanation,
  temperatureFeedbackCopy,
  type ClueFlowModalState,
} from "@/lib/game/clueFlow";

type ClueFlowModalProps = {
  state: ClueFlowModalState | null;
  isBusy?: boolean;
  /** Opens lock confirmation — must not finish the game. */
  onRequestLock: () => void;
  /** Confirms lock — runs the existing final-answer action. */
  onConfirmLock: () => void;
  /** Returns from lock confirmation to the decision state. */
  onCancelLock: () => void;
  onAdjust: () => void;
  onGetAnotherClue: () => void;
  onPlaceNextPin: () => void;
  onRetry: () => void;
};

export function ClueFlowModal({
  state,
  isBusy = false,
  onRequestLock,
  onConfirmLock,
  onCancelLock,
  onAdjust,
  onGetAnotherClue,
  onPlaceNextPin,
  onRetry,
}: ClueFlowModalProps) {
  const titleId = useId();
  const firstActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!state) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstActionRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      // Gameplay modal — Escape must not dismiss.
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [state]);

  if (!state) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* Non-dismissible scrim — not a button, no click-to-close */}
      <div className="absolute inset-0 bg-foreground/45 backdrop-blur-[2px]" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-sm rounded-t-2xl border border-rule bg-background p-4 shadow-xl sm:rounded-2xl sm:p-5"
      >
        {state.type === "decision" ? (
          <>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
              Pin {state.pinNumber} of 5
            </p>
            <h2
              id={titleId}
              className="mt-1 font-display text-xl font-bold tracking-tight"
            >
              Your pin is placed
            </h2>
            <p className="mt-1 text-sm text-muted">
              Lock it in, adjust it, or spend another clue
              {state.isFinalClue ? "." : " for more information."}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              {!state.isFinalClue ? (
                <button
                  ref={firstActionRef}
                  type="button"
                  disabled={isBusy}
                  onClick={onGetAnotherClue}
                  className="rounded-md bg-course px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  💡 Get another clue →
                </button>
              ) : null}
              <button
                ref={state.isFinalClue ? firstActionRef : undefined}
                type="button"
                disabled={isBusy}
                onClick={onRequestLock}
                className={
                  state.isFinalClue
                    ? "rounded-md bg-course px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                    : "rounded-md border border-course px-4 py-2.5 text-sm font-semibold text-course transition hover:bg-course-soft disabled:opacity-60"
                }
              >
                🎯 Lock final answer
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={onAdjust}
                className="rounded-md px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-neutral-50 hover:text-foreground disabled:opacity-60"
              >
                ↩ Adjust pin
              </button>
            </div>
          </>
        ) : null}

        {state.type === "lockConfirm" ? (
          <>
            <h2
              id={titleId}
              className="font-display text-xl font-bold tracking-tight"
            >
              🎯 Lock final answer?
            </h2>
            <p className="mt-2 text-sm text-muted">
              {lockConfirmExplanation(state.isFinalClue)}
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <button
                ref={firstActionRef}
                type="button"
                disabled={isBusy}
                onClick={onConfirmLock}
                className="rounded-md bg-course px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                🎯 Yes, lock it in
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={onCancelLock}
                className="rounded-md border border-rule px-4 py-2.5 text-sm font-semibold transition hover:bg-neutral-50 disabled:opacity-60"
              >
                ← Go back
              </button>
            </div>
          </>
        ) : null}

        {state.type === "nextClue" ? (
          <>
            {state.temperature ? (
              <div className="mb-3 rounded-lg bg-neutral-50 px-3 py-2.5">
                {(() => {
                  const copy = temperatureFeedbackCopy(state.temperature);
                  return (
                    <>
                      <p className="font-display text-lg font-bold tracking-tight">
                        <span aria-hidden="true">{copy.emoji} </span>
                        {copy.word}
                      </p>
                      <p className="mt-0.5 text-sm text-muted">{copy.sentence}</p>
                    </>
                  );
                })()}
              </div>
            ) : null}

            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
              Clue {state.clueNumber} of 5
            </p>
            <h2
              id={titleId}
              className="mt-1 font-display text-xl font-bold leading-snug tracking-tight"
            >
              {state.clueText}
            </h2>

            <button
              ref={firstActionRef}
              type="button"
              disabled={isBusy}
              onClick={onPlaceNextPin}
              className="mt-4 w-full rounded-md bg-course px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              📍 Place pin {state.nextPinNumber} →
            </button>
          </>
        ) : null}

        {state.type === "error" ? (
          <>
            <h2
              id={titleId}
              className="font-display text-xl font-bold tracking-tight"
            >
              Something went wrong
            </h2>
            <p className="mt-1 text-sm text-muted">{state.message}</p>
            <button
              ref={firstActionRef}
              type="button"
              disabled={isBusy}
              onClick={onRetry}
              className="mt-4 w-full rounded-md bg-course px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              Try again
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
