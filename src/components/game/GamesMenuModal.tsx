"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import type { GameMode } from "@/lib/game/modes";

type GamesMenuModalProps = {
  open: boolean;
  currentMode: GameMode;
  onClose: () => void;
};

const GAMES = [
  {
    mode: "daily" as const,
    href: "/",
    title: "Daily 5",
    subtitle: "UK Edition",
    emoji: "🇬🇧",
    detail: "Five clues to find today’s UK place.",
  },
  {
    mode: "football" as const,
    href: "/football",
    title: "Football 5",
    subtitle: "UK Edition",
    emoji: "⚽",
    detail: "Five clues to find today’s Football 92 home ground.",
  },
] as const;

export function GamesMenuModal({
  open,
  currentMode,
  onClose,
}: GamesMenuModalProps) {
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
        className="absolute inset-0 bg-foreground/45 backdrop-blur-[2px]"
        aria-label="Close games menu"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-sm overflow-hidden rounded-2xl border border-rule bg-background shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 px-4 pt-4">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
              Pin5
            </p>
            <h2
              id={titleId}
              className="mt-0.5 font-display text-2xl font-bold tracking-tight"
            >
              Choose a game
            </h2>
            <p className="mt-1 text-xs text-muted">
              Two daily games — play both each day.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rule text-xl leading-none text-muted transition hover:bg-neutral-50 hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <nav className="space-y-2 px-4 py-4" aria-label="Available games">
          {GAMES.map((game) => {
            const isCurrent = game.mode === currentMode;
            return (
              <Link
                key={game.mode}
                href={game.href}
                onClick={onClose}
                aria-current={isCurrent ? "page" : undefined}
                className={`block rounded-xl border px-3.5 py-3 transition ${
                  isCurrent
                    ? "border-course/30 bg-course-soft"
                    : "border-rule bg-neutral-50 hover:bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold tracking-tight">
                      <span aria-hidden="true" className="mr-1.5">
                        {game.emoji}
                      </span>
                      {game.title}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      {game.subtitle}
                    </p>
                    <p className="mt-1.5 text-xs leading-snug text-foreground/70">
                      {game.detail}
                    </p>
                  </div>
                  <span
                    className={`mt-1 shrink-0 text-sm font-semibold ${
                      isCurrent ? "text-course" : "text-muted"
                    }`}
                    aria-hidden="true"
                  >
                    {isCurrent ? "Playing" : "→"}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
