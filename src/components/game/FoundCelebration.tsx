"use client";

import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
} from "react";

import { FOUND_CELEBRATION_DURATION_MS } from "@/lib/game/found";
import type { GameReveal } from "@/types/game";

type FoundCelebrationProps = {
  reveal: GameReveal;
  onComplete: () => void;
};

export function FoundCelebration({
  reveal,
  onComplete,
}: FoundCelebrationProps) {
  const titleId = useId();
  const [reduceMotion, setReduceMotion] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    function onChange() {
      setReduceMotion(media.matches);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const skipAt = window.setTimeout(() => setCanSkip(true), 900);
    const endAt = window.setTimeout(onComplete, FOUND_CELEBRATION_DURATION_MS);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(skipAt);
      window.clearTimeout(endAt);
    };
  }, [onComplete]);

  const themeStyle = {
    "--course": reveal.accent,
    "--course-soft": reveal.accentSoft,
  } as CSSProperties;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-6"
      style={themeStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => {
        if (canSkip) {
          onComplete();
        }
      }}
    >
      <div className="absolute inset-0 bg-foreground/55 backdrop-blur-[3px]" />

      {!reduceMotion ? (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          {Array.from({ length: 18 }, (_, index) => (
            <span
              key={index}
              className="found-confetti absolute h-2 w-2 rounded-sm bg-course"
              style={{
                left: `${8 + ((index * 17) % 84)}%`,
                animationDelay: `${(index % 6) * 0.08}s`,
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="relative z-10 flex max-w-sm flex-col items-center text-center">
        <div className="relative flex h-28 w-28 items-center justify-center">
          {!reduceMotion ? (
            <div
              className="found-ring absolute h-28 w-28 rounded-full border-2 border-course"
              aria-hidden="true"
            />
          ) : null}
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full bg-course text-4xl text-white shadow-lg ${
              reduceMotion ? "" : "found-pop"
            }`}
            aria-hidden="true"
          >
            🎯
          </div>
        </div>

        <h2
          id={titleId}
          className="mt-6 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl"
        >
          YOU FOUND IT!
        </h2>
        <p
          className={`mt-3 font-display text-2xl font-semibold text-white ${
            reveal.mode === "football" ? "uppercase tracking-wide" : ""
          }`}
        >
          {reveal.answer.name}
        </p>
        {reveal.answer.stadium || reveal.answer.city ? (
          <div className="mt-2 space-y-0.5 text-sm text-white/85">
            {reveal.answer.stadium ? <p>{reveal.answer.stadium}</p> : null}
            {reveal.answer.city ? <p>{reveal.answer.city}</p> : null}
          </div>
        ) : (
          <p className="mt-2 text-sm text-white/80">
            You found today&apos;s location.
          </p>
        )}
      </div>
    </div>
  );
}
