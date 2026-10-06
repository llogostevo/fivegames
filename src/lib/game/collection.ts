/**
 * Pin5 Found / Bagged collection — browser-local only.
 */

import {
  FOOTBALL_LEAGUES,
  footballLeagueForMode,
} from "@/lib/game/football/leagues";
import { GAME_MODES, isFootballMode, type GameMode } from "@/lib/game/modes";
import type { GameReveal } from "@/types/game";

export const COLLECTION_STORAGE_KEY = "pin5.collection.v1";
export const COLLECTION_UPDATED_EVENT = "pin5:collection-updated";

/**
 * Dataset sizes for "of N" — keep in sync with each mode's COUNT constant.
 * Duplicated here so client bundles never import server dataset loaders.
 */
const PLACE_TOTAL_BY_MODE: Record<GameMode, number> = {
  world: 314,
  "world-airports": 890,
  daily: 28,
  "london-pubs": 107,
  "london-stations": 495,
  "taylor-swift": 94,
  "harry-potter": 241,
  marvel: 203,
  "star-wars": 145,
  football: FOOTBALL_LEAGUES.england.expectedClubCount,
  "football-italy": FOOTBALL_LEAGUES.italy.expectedClubCount,
  "football-germany": FOOTBALL_LEAGUES.germany.expectedClubCount,
  "football-france": FOOTBALL_LEAGUES.france.expectedClubCount,
  "football-spain": FOOTBALL_LEAGUES.spain.expectedClubCount,
};

export type CollectionStatus = "bagged" | "found";

export type CollectionPlaceRecord = {
  status: CollectionStatus;
  date: string;
  /** Display name captured at record time (played places only). */
  name: string;
};

export type CollectionState = {
  [gameId in GameMode]?: {
    [placeId: string]: CollectionPlaceRecord;
  };
};

export type CollectionOutcome = "bagged" | "found" | "none";

export type CollectionCounts = {
  found: number;
  bagged: number;
  total: number;
};

/** Dataset size for "of N" — never stored; always derived. */
export function collectionPlaceTotal(mode: GameMode): number {
  if (isFootballMode(mode)) {
    const leagueId = footballLeagueForMode(mode);
    if (leagueId) {
      return FOOTBALL_LEAGUES[leagueId].expectedClubCount;
    }
  }
  return PLACE_TOTAL_BY_MODE[mode];
}

export function collectionOutcomeFromReveal(
  reveal: Pick<GameReveal, "foundLocation" | "foundOnPin">,
): CollectionOutcome {
  if (reveal.foundLocation !== true) {
    return "none";
  }
  if (reveal.foundOnPin === 1) {
    return "bagged";
  }
  return "found";
}

/** Stable place id for collection keys (dataset id, or slug for daily UK). */
export function placeIdFromReveal(reveal: GameReveal): string | null {
  const fromAnswer = reveal.answer.placeId?.trim();
  if (fromAnswer) {
    return fromAnswer;
  }
  return slugifyPlaceId(reveal.answer.name);
}

export function slugifyPlaceId(name: string): string | null {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : null;
}

function emptyState(): CollectionState {
  return {};
}

function isCollectionStatus(value: unknown): value is CollectionStatus {
  return value === "bagged" || value === "found";
}

function parsePlaceRecord(value: unknown): CollectionPlaceRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (!isCollectionStatus(record.status)) {
    return null;
  }
  if (typeof record.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
    return null;
  }
  if (typeof record.name !== "string" || record.name.trim().length === 0) {
    return null;
  }
  return {
    status: record.status,
    date: record.date,
    name: record.name.trim(),
  };
}

export function parseCollectionState(raw: unknown): CollectionState {
  if (!raw || typeof raw !== "object") {
    return emptyState();
  }
  const source = raw as Record<string, unknown>;
  const next: CollectionState = {};

  for (const mode of GAME_MODES) {
    const modeRaw = source[mode];
    if (!modeRaw || typeof modeRaw !== "object") {
      continue;
    }
    const places: Record<string, CollectionPlaceRecord> = {};
    for (const [placeId, entry] of Object.entries(
      modeRaw as Record<string, unknown>,
    )) {
      if (!placeId.trim()) {
        continue;
      }
      const parsed = parsePlaceRecord(entry);
      if (parsed) {
        places[placeId] = parsed;
      }
    }
    if (Object.keys(places).length > 0) {
      next[mode] = places;
    }
  }

  return next;
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

export function readCollectionState(
  storage: Pick<Storage, "getItem"> | null = getStorage(),
): CollectionState {
  if (!storage) {
    return emptyState();
  }
  try {
    const raw = storage.getItem(COLLECTION_STORAGE_KEY);
    if (!raw) {
      return emptyState();
    }
    return parseCollectionState(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

function writeCollectionState(
  state: CollectionState,
  storage: Pick<Storage, "setItem"> | null = getStorage(),
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(state));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(COLLECTION_UPDATED_EVENT));
    }
  } catch {
    // Quota / private mode — ignore.
  }
}

/**
 * Rank for upgrade rules: bagged > found. Never downgrade.
 * Returns whether `incoming` should replace `existing`.
 */
export function shouldReplaceCollectionRecord(
  existing: CollectionPlaceRecord | undefined,
  incoming: CollectionPlaceRecord,
): boolean {
  if (!existing) {
    return true;
  }
  if (existing.status === "bagged") {
    return false;
  }
  if (incoming.status === "bagged" && existing.status === "found") {
    return true;
  }
  return false;
}

export function upsertCollectionPlace(
  state: CollectionState,
  mode: GameMode,
  placeId: string,
  incoming: CollectionPlaceRecord,
): CollectionState {
  const current = state[mode]?.[placeId];
  if (!shouldReplaceCollectionRecord(current, incoming)) {
    return state;
  }
  return {
    ...state,
    [mode]: {
      ...state[mode],
      [placeId]: incoming,
    },
  };
}

/**
 * Record Found/Bagged from a completed reveal.
 * Idempotent; upgrades Found → Bagged; never downgrades; skips non-finds.
 */
export function recordCollectionFromReveal(
  reveal: GameReveal,
  storage: Pick<Storage, "getItem" | "setItem"> | null = getStorage(),
): CollectionOutcome {
  try {
    const outcome = collectionOutcomeFromReveal(reveal);
    if (outcome === "none") {
      return "none";
    }
    const placeId = placeIdFromReveal(reveal);
    const mode = reveal.mode;
    if (!placeId || !mode) {
      return "none";
    }
    const current = readCollectionState(storage);
    const next = upsertCollectionPlace(current, mode, placeId, {
      status: outcome,
      date: reveal.date,
      name: reveal.answer.name.trim(),
    });
    if (next !== current) {
      writeCollectionState(next, storage);
    }
    return outcome;
  } catch {
    return "none";
  }
}

export function getCollectionCounts(
  mode: GameMode,
  state: CollectionState = readCollectionState(),
): CollectionCounts {
  const places = state[mode] ?? {};
  let found = 0;
  let bagged = 0;
  for (const record of Object.values(places)) {
    found += 1;
    if (record.status === "bagged") {
      bagged += 1;
    }
  }
  return {
    found,
    bagged,
    total: collectionPlaceTotal(mode),
  };
}

export function formatCollectionCountsLine(counts: CollectionCounts): string {
  return `${counts.found} found · ${counts.bagged} bagged · of ${counts.total}`;
}

export function formatCollectionCountsCompact(counts: CollectionCounts): string {
  return `${counts.found} found · ${counts.bagged} bagged of ${counts.total}`;
}

/** Places for a mode, most recent date first (then name). */
export function listCollectionPlaces(
  mode: GameMode,
  state: CollectionState = readCollectionState(),
): Array<CollectionPlaceRecord & { placeId: string }> {
  const places = state[mode] ?? {};
  return Object.entries(places)
    .map(([placeId, record]) => ({ placeId, ...record }))
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date < b.date ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });
}

/** England football expected count — used by tests / docs. */
export const ENGLAND_FOOTBALL_COLLECTION_TOTAL =
  FOOTBALL_LEAGUES.england.expectedClubCount;
