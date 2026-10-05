import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";
import {
  FOOTBALL_LEAGUES,
  type FootballLeagueId,
} from "@/lib/game/football/leagues";

export type FootballClub = {
  id: string;
  club: string;
  division: string;
  stadium: string;
  city: string;
  target: { lat: number; lng: number };
  clues: string[];
};

export type FootballDataset = {
  version: number;
  season: string;
  clubs: FootballClub[];
};

export class InvalidFootballDatasetError extends Error {
  constructor(reason: string) {
    super(`Invalid Football dataset: ${reason}`);
    this.name = "InvalidFootballDatasetError";
  }
}

function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidFootballDatasetError(`${field} must be a non-empty string`);
  }
}

function assertCoordinate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidFootballDatasetError(`${field} must be a finite number`);
  }
  return value;
}

export type ParseFootballDatasetOptions = {
  expectedClubCount: number;
  label?: string;
};

/** Validate a Football league payload. Safe to call from tests. */
export function parseFootballDataset(
  value: unknown,
  options: ParseFootballDatasetOptions,
): FootballDataset {
  const label = options.label ?? "Football";
  if (!value || typeof value !== "object") {
    throw new InvalidFootballDatasetError(`${label}: expected an object`);
  }

  const raw = value as Record<string, unknown>;
  let version = 1;
  if (raw.version !== undefined) {
    if (typeof raw.version !== "number" || !Number.isInteger(raw.version)) {
      throw new InvalidFootballDatasetError(`${label}: version must be an integer`);
    }
    version = raw.version;
  }
  assertNonEmptyString(raw.season, `${label} season`);

  if (!Array.isArray(raw.clubs)) {
    throw new InvalidFootballDatasetError(`${label}: clubs must be an array`);
  }

  if (raw.clubs.length !== options.expectedClubCount) {
    throw new InvalidFootballDatasetError(
      `${label}: expected exactly ${options.expectedClubCount} clubs, found ${raw.clubs.length}`,
    );
  }

  const seenIds = new Set<string>();
  const clubs: FootballClub[] = raw.clubs.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidFootballDatasetError(
        `${label}: clubs[${index}] must be an object`,
      );
    }
    const clubRaw = entry as Record<string, unknown>;

    assertNonEmptyString(clubRaw.id, `${label} clubs[${index}].id`);
    if (seenIds.has(clubRaw.id)) {
      throw new InvalidFootballDatasetError(
        `${label}: duplicate club id "${clubRaw.id}"`,
      );
    }
    seenIds.add(clubRaw.id);

    assertNonEmptyString(clubRaw.club, `${label} clubs[${index}].club`);
    assertNonEmptyString(clubRaw.division, `${label} clubs[${index}].division`);
    assertNonEmptyString(clubRaw.stadium, `${label} clubs[${index}].stadium`);
    assertNonEmptyString(clubRaw.city, `${label} clubs[${index}].city`);

    const targetRaw = clubRaw.target;
    if (!targetRaw || typeof targetRaw !== "object") {
      throw new InvalidFootballDatasetError(
        `${label}: clubs[${index}].target is required`,
      );
    }
    const target = targetRaw as Record<string, unknown>;
    const lat = assertCoordinate(
      target.lat,
      `${label} clubs[${index}].target.lat`,
    );
    const lng = assertCoordinate(
      target.lng,
      `${label} clubs[${index}].target.lng`,
    );
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new InvalidFootballDatasetError(
        `${label}: clubs[${index}].target coordinates out of range`,
      );
    }

    if (!Array.isArray(clubRaw.clues) || clubRaw.clues.length !== CLUE_COUNT) {
      throw new InvalidFootballDatasetError(
        `${label}: clubs[${index}].clues must contain exactly ${CLUE_COUNT} strings`,
      );
    }
    const clues = clubRaw.clues.map((clue, clueIndex) => {
      if (typeof clue !== "string" || clue.trim().length === 0) {
        throw new InvalidFootballDatasetError(
          `${label}: clubs[${index}].clues[${clueIndex}] must be a non-empty string`,
        );
      }
      return clue;
    });

    return {
      id: clubRaw.id.trim(),
      club: clubRaw.club.trim(),
      division: clubRaw.division.trim(),
      stadium: clubRaw.stadium.trim(),
      city: clubRaw.city.trim(),
      target: { lat, lng },
      clues,
    };
  });

  return {
    version,
    season: raw.season.trim(),
    clubs,
  };
}

function datasetPath(leagueId: FootballLeagueId): string {
  return path.join(
    process.cwd(),
    "data",
    "football",
    FOOTBALL_LEAGUES[leagueId].datasetFile,
  );
}

const cachedDatasets = new Map<FootballLeagueId, FootballDataset>();

/** Load and validate a Football league dataset (cached). Server-only. */
export async function loadFootballDataset(
  leagueId: FootballLeagueId = "england",
): Promise<FootballDataset> {
  const cached = cachedDatasets.get(leagueId);
  if (cached) {
    return cached;
  }

  const league = FOOTBALL_LEAGUES[leagueId];
  let raw: string;
  try {
    raw = await readFile(datasetPath(leagueId), "utf8");
  } catch {
    throw new InvalidFootballDatasetError(
      `missing file at data/football/${league.datasetFile}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidFootballDatasetError(
      `${league.label}: file is not valid JSON`,
    );
  }

  const dataset = parseFootballDataset(parsed, {
    expectedClubCount: league.expectedClubCount,
    label: league.label,
  });
  cachedDatasets.set(leagueId, dataset);
  return dataset;
}

/** Test helper — clear module cache between tests if needed. */
export function resetFootballDatasetCache(
  leagueId?: FootballLeagueId,
): void {
  if (leagueId) {
    cachedDatasets.delete(leagueId);
    return;
  }
  cachedDatasets.clear();
}

export function getFootballClubById(
  dataset: FootballDataset,
  clubId: string,
): FootballClub {
  const club = dataset.clubs.find((entry) => entry.id === clubId);
  if (!club) {
    throw new InvalidFootballDatasetError(`unknown club id "${clubId}"`);
  }
  return club;
}
