"use client";

import { useState } from "react";

import { DEV_DATE_COOKIE } from "@/lib/game/constants";

const DEV_GAME_OPTIONS = [
  { date: "2026-09-28", label: "Mon 28 Sep — Music #1" },
  { date: "2026-09-29", label: "Tue 29 Sep — Movies & TV #2" },
  { date: "2026-09-30", label: "Wed 30 Sep — Sport #3" },
  { date: "2026-10-01", label: "Thu 1 Oct — History #4" },
  { date: "2026-10-02", label: "Fri 2 Oct — World #5" },
  { date: "2026-10-03", label: "Sat 3 Oct — Culture #6" },
  { date: "2026-10-04", label: "Sun 4 Oct — Wildcard #7" },
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

/** Temporary date switcher for testing (dev, or production with FIVEGAMES_ALLOW_DATE_OVERRIDE). */
export function DevDateToolbar({ initialDate = "" }: DevDateToolbarProps) {
  const [value, setValue] = useState(initialDate);

  return (
    <div className="sticky top-0 z-50 border-b border-amber-700/40 bg-amber-100 text-amber-950">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 py-1.5 text-xs sm:px-4">
        <span className="font-semibold uppercase tracking-[0.12em]">
          Dev date
        </span>
        <label className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          <span className="sr-only">Test game date</span>
          <select
            value={value}
            onChange={(event) => {
              const next = event.target.value;
              setValue(next);
              writeDevDateCookie(next);
              window.location.reload();
            }}
            className="min-w-0 flex-1 rounded border border-amber-700/30 bg-white px-2 py-1 font-medium text-amber-950 sm:min-w-[18rem]"
          >
            <option value="">Real clock / env override</option>
            {DEV_GAME_OPTIONS.map((option) => (
              <option key={option.date} value={option.date}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-amber-900/80">Temporary testing only</span>
      </div>
    </div>
  );
}
