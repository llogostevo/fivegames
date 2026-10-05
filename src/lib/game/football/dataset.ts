import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";

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
    super(`Invalid Football 92 dataset: ${reason}`);
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

/** Validate the Football 92 payload. Safe to call from tests. */
export function parseFootballDataset(value: unknown): FootballDataset {
  if (!value || typeof value !== "object") {
    throw new InvalidFootballDatasetError("expected an object");
  }

  const raw = value as Record<string, unknown>;
  if (typeof raw.version !== "number" || !Number.isInteger(raw.version)) {
    throw new InvalidFootballDatasetError("version must be an integer");
  }
  assertNonEmptyString(raw.season, "season");

  if (!Array.isArray(raw.clubs)) {
    throw new InvalidFootballDatasetError("clubs must be an array");
  }

  if (raw.clubs.length !== 92) {
    throw new InvalidFootballDatasetError(
      `expected exactly 92 clubs, found ${raw.clubs.length}`,
    );
  }

  const seenIds = new Set<string>();
  const clubs: FootballClub[] = raw.clubs.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidFootballDatasetError(`clubs[${index}] must be an object`);
    }
    const clubRaw = entry as Record<string, unknown>;

    assertNonEmptyString(clubRaw.id, `clubs[${index}].id`);
    if (seenIds.has(clubRaw.id)) {
      throw new InvalidFootballDatasetError(`duplicate club id "${clubRaw.id}"`);
    }
    seenIds.add(clubRaw.id);

    assertNonEmptyString(clubRaw.club, `clubs[${index}].club`);
    assertNonEmptyString(clubRaw.division, `clubs[${index}].division`);
    assertNonEmptyString(clubRaw.stadium, `clubs[${index}].stadium`);
    assertNonEmptyString(clubRaw.city, `clubs[${index}].city`);

    const targetRaw = clubRaw.target;
    if (!targetRaw || typeof targetRaw !== "object") {
      throw new InvalidFootballDatasetError(
        `clubs[${index}].target is required`,
      );
    }
    const target = targetRaw as Record<string, unknown>;
    const lat = assertCoordinate(target.lat, `clubs[${index}].target.lat`);
    const lng = assertCoordinate(target.lng, `clubs[${index}].target.lng`);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new InvalidFootballDatasetError(
        `clubs[${index}].target coordinates out of range`,
      );
    }

    if (!Array.isArray(clubRaw.clues) || clubRaw.clues.length !== CLUE_COUNT) {
      throw new InvalidFootballDatasetError(
        `clubs[${index}].clues must contain exactly ${CLUE_COUNT} strings`,
      );
    }
    const clues = clubRaw.clues.map((clue, clueIndex) => {
      if (typeof clue !== "string" || clue.trim().length === 0) {
        throw new InvalidFootballDatasetError(
          `clubs[${index}].clues[${clueIndex}] must be a non-empty string`,
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
    version: raw.version,
    season: raw.season.trim(),
    clubs,
  };
}

function datasetPath(): string {
  return path.join(
    process.cwd(),
    "data",
    "football",
    "pin5-football92-2026-27.json",
  );
}

let cachedDataset: FootballDataset | null = null;

/** Load and validate the Football 92 dataset (cached). Server-only. */
export async function loadFootballDataset(): Promise<FootballDataset> {
  if (cachedDataset) {
    return cachedDataset;
  }

  let raw: string;
  try {
    raw = await readFile(datasetPath(), "utf8");
  } catch {
    throw new InvalidFootballDatasetError(
      `missing file at data/football/pin5-football92-2026-27.json`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidFootballDatasetError("file is not valid JSON");
  }

  cachedDataset = parseFootballDataset(parsed);
  return cachedDataset;
}

/** Test helper — clear module cache between tests if needed. */
export function resetFootballDatasetCache(): void {
  cachedDataset = null;
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
