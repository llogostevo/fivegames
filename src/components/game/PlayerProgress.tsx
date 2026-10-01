"use client";

import {
  formatStreakLabel,
  type WeeklyStats,
} from "@/lib/game/playerHistory";
import { SCORING } from "@/lib/game/scoring";
import { getTheme } from "@/lib/game/themes";

type PlayerProgressProps = {
  todayScore: number;
  /** Currently released / completed game date (for highlighting today). */
  referenceDate: string;
  weekly: WeeklyStats;
  streak: number;
};

function dayTitle(day: WeeklyStats["days"][number]): string {
  const weekday = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][day.weekdayIndex]!;

  if (day.score !== null && day.theme) {
    return `${weekday} — ${getTheme(day.theme).label} — ${day.score.toLocaleString()} points`;
  }
  if (day.status === "today") {
    return `${weekday} — today`;
  }
  if (day.status === "future") {
    return `${weekday} — upcoming`;
  }
  return `${weekday} — not completed`;
}

export function PlayerProgress({
  todayScore,
  referenceDate,
  weekly,
  streak,
}: PlayerProgressProps) {
  return (
    <div className="space-y-2.5 rounded-lg border border-rule px-3 py-2.5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
            Today
          </p>
          <p className="mt-0.5 font-display text-lg font-bold tracking-tight tabular-nums">
            {todayScore.toLocaleString()}
            <span className="text-xs font-semibold text-muted">
              {" "}
              / {SCORING.MAX_TOTAL_POINTS.toLocaleString()}
            </span>
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted">
            This week
          </p>
          <p className="mt-0.5 font-display text-lg font-bold tracking-tight tabular-nums">
            {weekly.weeklyScore.toLocaleString()}
            <span className="text-xs font-semibold text-muted">
              {" "}
              / {weekly.maxWeeklyScore.toLocaleString()}
            </span>
          </p>
        </div>
      </div>

      <ol
        className="flex items-center justify-between gap-1"
        aria-label="Weekly completions Monday to Sunday"
      >
        {weekly.days.map((day) => {
          const filled = day.status === "completed";
          const isToday = day.date === referenceDate;

          return (
            <li
              key={day.date}
              className="flex flex-1 flex-col items-center gap-0.5"
            >
              <span className="text-[10px] font-semibold text-muted">
                {day.label}
              </span>
              <span
                title={dayTitle(day)}
                aria-label={dayTitle(day)}
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold leading-none ${
                  filled
                    ? "border-course bg-course text-white"
                    : isToday
                      ? "border-course bg-course-soft text-course"
                      : day.status === "missed"
                        ? "border-rule bg-white text-muted"
                        : "border-dashed border-rule bg-neutral-50 text-muted/60"
                }`}
              >
                {filled ? (
                  <span aria-hidden="true">✓</span>
                ) : isToday ? (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-course"
                  />
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      {streak > 0 ? (
        <p className="text-center text-xs font-semibold text-foreground">
          <span aria-hidden="true">🔥 </span>
          {formatStreakLabel(streak)}
        </p>
      ) : null}
    </div>
  );
}
