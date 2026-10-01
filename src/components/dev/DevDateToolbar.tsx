"use client";

import { useState } from "react";

import { DEV_DATE_COOKIE } from "@/lib/game/constants";

/**
 * Development-only date switcher.
 * Labels intentionally omit answer names so they never leak via this UI.
 * This module must only be loaded through DevDateToolbarHost (excluded in production).
 */
const DEV_GAME_OPTIONS = [
  { date: "2026-09-28", label: "W1 Mon 28 Sep — Music #1" },
  { date: "2026-09-29", label: "W1 Tue 29 Sep — Movies & TV #2" },
  { date: "2026-09-30", label: "W1 Wed 30 Sep — Sport #3" },
  { date: "2026-10-01", label: "W1 Thu 1 Oct — History #4" },
  { date: "2026-10-02", label: "W1 Fri 2 Oct — World #5" },
  { date: "2026-10-03", label: "W1 Sat 3 Oct — Culture #6" },
  { date: "2026-10-04", label: "W1 Sun 4 Oct — Wildcard #7" },
  { date: "2026-10-05", label: "W2 Mon 5 Oct — Music #8" },
  { date: "2026-10-06", label: "W2 Tue 6 Oct — Movies & TV #9" },
  { date: "2026-10-07", label: "W2 Wed 7 Oct — Sport #10" },
  { date: "2026-10-08", label: "W2 Thu 8 Oct — History #11" },
  { date: "2026-10-09", label: "W2 Fri 9 Oct — World #12" },
  { date: "2026-10-10", label: "W2 Sat 10 Oct — Culture #13" },
  { date: "2026-10-11", label: "W2 Sun 11 Oct — Wildcard #14" },
  { date: "2026-10-12", label: "W3 Mon 12 Oct — Music #15" },
  { date: "2026-10-13", label: "W3 Tue 13 Oct — Movies & TV #16" },
  { date: "2026-10-14", label: "W3 Wed 14 Oct — Sport #17" },
  { date: "2026-10-15", label: "W3 Thu 15 Oct — History #18" },
  { date: "2026-10-16", label: "W3 Fri 16 Oct — World #19" },
  { date: "2026-10-17", label: "W3 Sat 17 Oct — Culture #20" },
  { date: "2026-10-18", label: "W3 Sun 18 Oct — Wildcard #21" },
  { date: "2026-10-19", label: "W4 Mon 19 Oct — Music #22" },
  { date: "2026-10-20", label: "W4 Tue 20 Oct — Movies & TV #23" },
  { date: "2026-10-21", label: "W4 Wed 21 Oct — Sport #24" },
  { date: "2026-10-22", label: "W4 Thu 22 Oct — History #25" },
  { date: "2026-10-23", label: "W4 Fri 23 Oct — World #26" },
  { date: "2026-10-24", label: "W4 Sat 24 Oct — Culture #27" },
  { date: "2026-10-25", label: "W4 Sun 25 Oct — Wildcard #28" },
] as const;

function writeDevDateCookie(date: string) {
  if (date) {
    document.cookie = `${DEV_DATE_COOKIE}=${encodeURIComponent(date)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
  } else {
    document.cookie = `${DEV_DATE_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}

type DevDateToolbarProps = {
  initialDate?: string;
};

/** Temporary beta date switcher — development builds only. */
export function DevDateToolbar({ initialDate = "" }: DevDateToolbarProps) {
  const [value, setValue] = useState(initialDate);

  return (
    <div className="sticky top-0 z-50 border-b border-amber-700/40 bg-amber-100 text-amber-950">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-3 py-2 text-sm">
        <label htmlFor="dev-date" className="font-semibold">
          Dev date
        </label>
        <select
          id="dev-date"
          value={value}
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            writeDevDateCookie(next);
            window.location.reload();
          }}
          className="min-w-0 flex-1 rounded border border-amber-800/30 bg-white px-2 py-1 text-sm text-amber-950 sm:flex-none sm:min-w-[18rem]"
        >
          <option value="">Real clock / env override</option>
          {DEV_GAME_OPTIONS.map((option) => (
            <option key={option.date} value={option.date}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-amber-900/80">Temporary testing only</span>
      </div>
    </div>
  );
}
