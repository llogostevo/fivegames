/**
 * Pin5 Found / Bagged collection — browser-local only.
 */

import {
  FOOTBALL_LEAGUES,
  footballLeagueForMode,
} from "@/lib/game/football/leagues";
import { GAME_MODES, isFootballMode, type GameMode } from "@/lib/game/modes";
import {
  readPlayerHistory,
  type PlayerHistory,
} from "@/lib/game/playerHistory";
import type { GameReveal } from "@/types/game";

export const COLLECTION_STORAGE_KEY = "pin5.collection.v1";
export const COLLECTION_UPDATED_EVENT = "pin5:collection-updated";

/**
 * Dataset sizes for "of N" — must match the pool each daily game actually serves
 * (schedule placeCount / orderedIds.length from each mode's loader).
 *
 * Film/music datasets (Marvel, Harry Potter, Star Wars, Taylor Swift): parsers
 * require status === "ready" and COUNT equals the validated array length, so the
 * served pool is ready-only. If a future loader started including status
 * "review" in selection without changing COUNT, flag that here — do not change
 * selection behaviour from the collection layer.
 *
 * World / airports / stations / pubs / football: every validated dataset entry
 * is cycled (stations may use provisional clues; all station ids are still served).
 *
 * Daily UK: one place per dated game file under data/games/ (no status field).
 */
const PLACE_TOTAL_BY_MODE: Record<GameMode, number> = {
  world: 314, // WORLD_PLACE_COUNT
  "world-airports": 890, // WORLD_AIRPORTS_COUNT
  daily: 28, // data/games/*.json
  "london-pubs": 107, // LONDON_PUBS_COUNT
  "london-stations": 495, // LONDON_STATIONS_COUNT
  "uk-stations": 316, // UK_RAIL_READY_COUNT
  "taylor-swift": 94, // TAYLOR_SWIFT_COUNT (ready-only via parser)
  "harry-potter": 241, // HARRY_POTTER_COUNT (ready-only via parser)
  marvel: 203, // MARVEL_COUNT (ready-only via parser)
  "star-wars": 145, // STAR_WARS_COUNT (ready-only via parser)
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

/** Friendly collection date, e.g. "Sun 25 Oct". */
export function formatCollectionDate(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate;
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year!, month! - 1, day!, 12));
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(utc)
    .replace(",", "");
}

export function getOverallCollectionCounts(
  state: CollectionState = readCollectionState(),
): Pick<CollectionCounts, "found" | "bagged"> {
  let found = 0;
  let bagged = 0;
  for (const mode of GAME_MODES) {
    const counts = getCollectionCounts(mode, state);
    found += counts.found;
    bagged += counts.bagged;
  }
  return { found, bagged };
}

export type TodayCollectionHighlight = {
  status: CollectionStatus;
  name: string;
  mode: GameMode;
};

/** One highlight for today's finds — bagged preferred; never invents names. */
export function getTodayCollectionHighlight(
  today: string,
  state: CollectionState = readCollectionState(),
): TodayCollectionHighlight | null {
  let foundFallback: TodayCollectionHighlight | null = null;
  for (const mode of GAME_MODES) {
    const places = state[mode] ?? {};
    for (const record of Object.values(places)) {
      if (record.date !== today) {
        continue;
      }
      const hit = {
        status: record.status,
        name: record.name,
        mode,
      } as const;
      if (record.status === "bagged") {
        return hit;
      }
      if (!foundFallback) {
        foundFallback = hit;
      }
    }
  }
  return foundFallback;
}

export type CollectionPlaceRow = CollectionPlaceRecord & {
  placeId: string;
  mode: GameMode;
};

/** Activity row for the collection UI — never invents unplayed place names. */
export type CollectionActivityRow =
  | (CollectionPlaceRow & {
      kind: "bagged" | "found";
      score: number | null;
      distanceMeters: number | null;
    })
  | {
      kind: "played";
      mode: GameMode;
      date: string;
      score: number;
      distanceMeters: number | null;
    };

export function formatCollectionScore(score: number): string {
  return `${score.toLocaleString("en-GB")} pts`;
}

/** Compact distance for collection rows (same bands as share copy). */
export function formatCollectionDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  if (meters < 10_000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  if (meters < 100_000) {
    return `${Math.round(meters / 1000)} km`;
  }
  return `${Math.round(meters / 1000).toLocaleString("en-GB")} km`;
}

export function latestCollectionDate(
  mode: GameMode,
  state: CollectionState,
): string | null {
  const places = listCollectionPlaces(mode, state);
  return places[0]?.date ?? null;
}

export function listPlacesForModes(
  modes: readonly GameMode[],
  state: CollectionState,
): CollectionPlaceRow[] {
  const rows: CollectionPlaceRow[] = [];
  for (const mode of modes) {
    for (const place of listCollectionPlaces(mode, state)) {
      rows.push({ ...place, mode });
    }
  }
  return rows.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? 1 : -1;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Merge Found/Bagged collection rows with played-but-not-found history.
 * Played rows never include the answer name.
 */
export function listActivityForModes(
  modes: readonly GameMode[],
  state: CollectionState,
  historyByMode: Partial<Record<GameMode, PlayerHistory>>,
): CollectionActivityRow[] {
  const rows: CollectionActivityRow[] = [];

  for (const mode of modes) {
    const places = listCollectionPlaces(mode, state);
    const history = historyByMode[mode];
    const collectedDates = new Set(places.map((place) => place.date));

    for (const place of places) {
      const game = history?.games[place.date];
      const score = game?.score;
      const distanceMeters = game?.finalDistanceMeters;
      rows.push({
        ...place,
        mode,
        kind: place.status,
        score: typeof score === "number" ? score : null,
        distanceMeters:
          typeof distanceMeters === "number" ? distanceMeters : null,
      });
    }

    if (history) {
      for (const [date, game] of Object.entries(history.games)) {
        if (collectedDates.has(date)) {
          continue;
        }
        rows.push({
          kind: "played",
          mode,
          date,
          score: game.score,
          distanceMeters:
            typeof game.finalDistanceMeters === "number"
              ? game.finalDistanceMeters
              : null,
        });
      }
    }
  }

  return rows.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? 1 : -1;
    }
    if (a.kind === "played" && b.kind === "played") {
      return 0;
    }
    if (a.kind === "played") {
      return 1;
    }
    if (b.kind === "played") {
      return -1;
    }
    return a.name.localeCompare(b.name);
  });
}

export function readAllPlayerHistories(
  storage: Pick<Storage, "getItem"> | null = typeof window !== "undefined"
    ? window.localStorage
    : null,
): Partial<Record<GameMode, PlayerHistory>> {
  const result: Partial<Record<GameMode, PlayerHistory>> = {};
  for (const mode of GAME_MODES) {
    result[mode] = readPlayerHistory(storage, mode);
  }
  return result;
}

export function modeHasPlayHistory(
  mode: GameMode,
  historyByMode: Partial<Record<GameMode, PlayerHistory>>,
): boolean {
  const history = historyByMode[mode];
  return Boolean(history && Object.keys(history.games).length > 0);
}

export function latestPlayOrCollectionDate(
  mode: GameMode,
  state: CollectionState,
  historyByMode: Partial<Record<GameMode, PlayerHistory>>,
): string | null {
  let latest = latestCollectionDate(mode, state);
  const history = historyByMode[mode];
  if (history) {
    for (const date of Object.keys(history.games)) {
      if (!latest || date > latest) {
        latest = date;
      }
    }
  }
  return latest;
}

export function summarizePlayHistory(
  modes: readonly GameMode[],
  historyByMode: Partial<Record<GameMode, PlayerHistory>>,
): { played: boolean; latestScore: number | null; playCount: number } {
  let playCount = 0;
  let latestDate: string | null = null;
  let latestScore: number | null = null;
  for (const mode of modes) {
    const history = historyByMode[mode];
    if (!history) {
      continue;
    }
    for (const [date, game] of Object.entries(history.games)) {
      playCount += 1;
      if (!latestDate || date > latestDate) {
        latestDate = date;
        latestScore = game.score;
      }
    }
  }
  return {
    played: playCount > 0,
    latestScore,
    playCount,
  };
}

export type CollectionViewGroup =
  | {
      kind: "single";
      mode: GameMode;
      counts: CollectionCounts;
      places: CollectionPlaceRow[];
      activity: CollectionActivityRow[];
      latestDate: string | null;
      played: boolean;
      latestScore: number | null;
    }
  | {
      kind: "football";
      modes: GameMode[];
      counts: CollectionCounts;
      places: CollectionPlaceRow[];
      activity: CollectionActivityRow[];
      latestDate: string | null;
      played: boolean;
      latestScore: number | null;
      leagues: Array<{
        mode: GameMode;
        counts: CollectionCounts;
        played: boolean;
        latestScore: number | null;
      }>;
    };

function aggregateCounts(
  modes: readonly GameMode[],
  state: CollectionState,
): CollectionCounts {
  let found = 0;
  let bagged = 0;
  let total = 0;
  for (const mode of modes) {
    const counts = getCollectionCounts(mode, state);
    found += counts.found;
    bagged += counts.bagged;
    total += counts.total;
  }
  return { found, bagged, total };
}

function latestDateAmong(
  modes: readonly GameMode[],
  state: CollectionState,
  historyByMode: Partial<Record<GameMode, PlayerHistory>>,
): string | null {
  let latest: string | null = null;
  for (const mode of modes) {
    const date = latestPlayOrCollectionDate(mode, state, historyByMode);
    if (date && (!latest || date > latest)) {
      latest = date;
    }
  }
  return latest;
}

/** Presentation groups for the collection page (storage stays per-mode). */
export function buildCollectionView(
  state: CollectionState = readCollectionState(),
  historyByMode: Partial<Record<GameMode, PlayerHistory>> = readAllPlayerHistories(),
): {
  started: CollectionViewGroup[];
  notStarted: CollectionViewGroup[];
} {
  const footballModes = GAME_MODES.filter((mode) => isFootballMode(mode));
  const otherModes = GAME_MODES.filter((mode) => !isFootballMode(mode));

  const groups: CollectionViewGroup[] = [];

  for (const mode of otherModes) {
    const counts = getCollectionCounts(mode, state);
    const play = summarizePlayHistory([mode], historyByMode);
    groups.push({
      kind: "single",
      mode,
      counts,
      places: listPlacesForModes([mode], state),
      activity: listActivityForModes([mode], state, historyByMode),
      latestDate: latestPlayOrCollectionDate(mode, state, historyByMode),
      played: play.played,
      latestScore: play.latestScore,
    });
  }

  const footballPlay = summarizePlayHistory(footballModes, historyByMode);
  groups.push({
    kind: "football",
    modes: [...footballModes],
    counts: aggregateCounts(footballModes, state),
    places: listPlacesForModes(footballModes, state),
    activity: listActivityForModes(footballModes, state, historyByMode),
    latestDate: latestDateAmong(footballModes, state, historyByMode),
    played: footballPlay.played,
    latestScore: footballPlay.latestScore,
    leagues: footballModes.map((mode) => {
      const play = summarizePlayHistory([mode], historyByMode);
      return {
        mode,
        counts: getCollectionCounts(mode, state),
        played: play.played,
        latestScore: play.latestScore,
      };
    }),
  });

  const started = groups
    .filter((group) => group.counts.found > 0 || group.played)
    .sort((a, b) => {
      const aDate = a.latestDate ?? "";
      const bDate = b.latestDate ?? "";
      if (aDate !== bDate) {
        return aDate < bDate ? 1 : -1;
      }
      return 0;
    });
  const notStarted = groups.filter(
    (group) => group.counts.found === 0 && !group.played,
  );

  return { started, notStarted };
}

/** England football expected count — used by tests / docs. */
export const ENGLAND_FOOTBALL_COLLECTION_TOTAL =
  FOOTBALL_LEAGUES.england.expectedClubCount;
