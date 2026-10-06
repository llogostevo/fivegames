/**
 * Anonymous browser-local visit state for Pin5.
 * Not site-wide retention — localStorage only, no IDs / fingerprints.
 */

import {
  DEFAULT_CAMPAIGN_REF,
  sanitiseCampaignRef,
} from "@/lib/analytics/campaign";
import { isValidIsoDate } from "@/lib/game/date";

export const VISITOR_STORAGE_KEY = "pin5_visitor_v1";
export const MAX_DAYS_PLAYED_TRACKED = 60;

export type VisitorState = {
  firstVisit: string;
  lastVisit: string;
  /** Recent London calendar dates this browser visited (newest last, capped). */
  daysPlayed: string[];
  gamesStarted: number;
  gamesCompleted: number;
  firstRef: string;
};

function emptyState(today: string, firstRef: string): VisitorState {
  return {
    firstVisit: today,
    lastVisit: today,
    daysPlayed: [today],
    gamesStarted: 0,
    gamesCompleted: 0,
    firstRef,
  };
}

function getStorage(): Storage | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Europe/London YYYY-MM-DD for visit attribution (not release-gated). */
export function londonCalendarDate(now: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fall through
  }
  return now.toISOString().slice(0, 10);
}

export function parseVisitorState(raw: unknown): VisitorState | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Record<string, unknown>;
  if (
    typeof value.firstVisit !== "string" ||
    !isValidIsoDate(value.firstVisit) ||
    typeof value.lastVisit !== "string" ||
    !isValidIsoDate(value.lastVisit)
  ) {
    return null;
  }
  const daysPlayed = Array.isArray(value.daysPlayed)
    ? value.daysPlayed.filter(
        (day): day is string =>
          typeof day === "string" && isValidIsoDate(day),
      )
    : [];
  const firstRef =
    sanitiseCampaignRef(
      typeof value.firstRef === "string" ? value.firstRef : null,
    ) ?? DEFAULT_CAMPAIGN_REF;

  return {
    firstVisit: value.firstVisit,
    lastVisit: value.lastVisit,
    daysPlayed: daysPlayed.slice(-MAX_DAYS_PLAYED_TRACKED),
    gamesStarted:
      typeof value.gamesStarted === "number" && value.gamesStarted >= 0
        ? Math.floor(value.gamesStarted)
        : 0,
    gamesCompleted:
      typeof value.gamesCompleted === "number" && value.gamesCompleted >= 0
        ? Math.floor(value.gamesCompleted)
        : 0,
    firstRef,
  };
}

export function readVisitorState(): VisitorState | null {
  const storage = getStorage();
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(VISITOR_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parseVisitorState(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeVisitorState(state: VisitorState): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota / private mode — ignore.
  }
}

/**
 * Touch visit state for today.
 * Optionally set firstRef only when none is stored yet.
 * Returns the updated (or created) state.
 */
export function touchVisitorState(options?: {
  today?: string;
  incomingRef?: string | null;
}): VisitorState {
  const today = options?.today ?? londonCalendarDate();
  const incoming = sanitiseCampaignRef(options?.incomingRef) ?? null;
  const existing = readVisitorState();

  if (!existing) {
    const created = emptyState(today, incoming ?? DEFAULT_CAMPAIGN_REF);
    writeVisitorState(created);
    return created;
  }

  const next: VisitorState = { ...existing };
  next.lastVisit = today;
  if (!next.daysPlayed.includes(today)) {
    next.daysPlayed = [...next.daysPlayed, today].slice(
      -MAX_DAYS_PLAYED_TRACKED,
    );
  }
  // First attribution is sticky — never overwrite on later visits.

  writeVisitorState(next);
  return next;
}

export function getCampaignRefForEvents(): string {
  return readVisitorState()?.firstRef ?? DEFAULT_CAMPAIGN_REF;
}

export function recordGameStartedLocally(): void {
  const state = touchVisitorState();
  state.gamesStarted += 1;
  writeVisitorState(state);
}

export function recordGameCompletedLocally(): void {
  const state = touchVisitorState();
  state.gamesCompleted += 1;
  writeVisitorState(state);
}

/** How many distinct visit days this browser has (capped list length). */
export function countVisitDays(state: VisitorState = readVisitorState() ?? emptyState(londonCalendarDate(), DEFAULT_CAMPAIGN_REF)): number {
  return state.daysPlayed.length;
}

export function isReturningBrowser(state: VisitorState | null = readVisitorState()): boolean {
  if (!state) {
    return false;
  }
  return state.daysPlayed.length > 1 || state.firstVisit !== state.lastVisit;
}
