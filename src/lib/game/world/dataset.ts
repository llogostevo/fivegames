/**
 * World places dataset (pin5-world).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";

export const WORLD_PLACE_COUNT = 314;

export const WORLD_DATASET_FILE = "pin5-world-places.json";

export type WorldPlace = {
  id: string;
  name: string;
  type: string;
  region: string;
  country: string;
  difficulty: string;
  target: { lat: number; lng: number };
  clues: string[];
};

export type WorldDataset = {
  dataset: string;
  count: number;
  places: WorldPlace[];
};

export class InvalidWorldDatasetError extends Error {
  constructor(reason: string) {
    super(`Invalid World dataset: ${reason}`);
    this.name = "InvalidWorldDatasetError";
  }
}

function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidWorldDatasetError(`${field} must be a non-empty string`);
  }
}

function assertCoordinate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidWorldDatasetError(`${field} must be a finite number`);
  }
  return value;
}

/** Validate a World places payload. Safe to call from tests. */
export function parseWorldDataset(value: unknown): WorldDataset {
  if (!value || typeof value !== "object") {
    throw new InvalidWorldDatasetError("expected an object");
  }

  const raw = value as Record<string, unknown>;
  assertNonEmptyString(raw.dataset, "dataset");

  if (!Array.isArray(raw.places)) {
    throw new InvalidWorldDatasetError("places must be an array");
  }

  if (raw.places.length !== WORLD_PLACE_COUNT) {
    throw new InvalidWorldDatasetError(
      `expected exactly ${WORLD_PLACE_COUNT} places, found ${raw.places.length}`,
    );
  }

  if (
    typeof raw.count === "number" &&
    raw.count !== raw.places.length
  ) {
    throw new InvalidWorldDatasetError(
      `count (${raw.count}) does not match places length (${raw.places.length})`,
    );
  }

  const seenIds = new Set<string>();
  const places: WorldPlace[] = raw.places.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidWorldDatasetError(`places[${index}] must be an object`);
    }
    const placeRaw = entry as Record<string, unknown>;

    assertNonEmptyString(placeRaw.id, `places[${index}].id`);
    if (seenIds.has(placeRaw.id)) {
      throw new InvalidWorldDatasetError(
        `duplicate place id "${placeRaw.id}"`,
      );
    }
    seenIds.add(placeRaw.id);

    assertNonEmptyString(placeRaw.name, `places[${index}].name`);
    assertNonEmptyString(placeRaw.type, `places[${index}].type`);
    assertNonEmptyString(placeRaw.region, `places[${index}].region`);
    assertNonEmptyString(placeRaw.country, `places[${index}].country`);
    assertNonEmptyString(placeRaw.difficulty, `places[${index}].difficulty`);

    const targetRaw = placeRaw.target;
    if (!targetRaw || typeof targetRaw !== "object") {
      throw new InvalidWorldDatasetError(
        `places[${index}].target is required`,
      );
    }
    const target = targetRaw as Record<string, unknown>;
    const lat = assertCoordinate(target.lat, `places[${index}].target.lat`);
    const lng = assertCoordinate(target.lng, `places[${index}].target.lng`);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new InvalidWorldDatasetError(
        `places[${index}].target coordinates out of range`,
      );
    }

    if (!Array.isArray(placeRaw.clues) || placeRaw.clues.length !== CLUE_COUNT) {
      throw new InvalidWorldDatasetError(
        `places[${index}].clues must contain exactly ${CLUE_COUNT} strings`,
      );
    }
    const clues = placeRaw.clues.map((clue, clueIndex) => {
      if (typeof clue !== "string" || clue.trim().length === 0) {
        throw new InvalidWorldDatasetError(
          `places[${index}].clues[${clueIndex}] must be a non-empty string`,
        );
      }
      return clue;
    });

    return {
      id: placeRaw.id.trim(),
      name: placeRaw.name.trim(),
      type: placeRaw.type.trim(),
      region: placeRaw.region.trim(),
      country: placeRaw.country.trim(),
      difficulty: placeRaw.difficulty.trim(),
      target: { lat, lng },
      clues,
    };
  });

  return {
    dataset: raw.dataset.trim(),
    count: places.length,
    places,
  };
}

function datasetPath(): string {
  return path.join(process.cwd(), "data", "world", WORLD_DATASET_FILE);
}

let cachedDataset: WorldDataset | null = null;

/** Load and validate the World places dataset (cached). Server-only. */
export async function loadWorldDataset(): Promise<WorldDataset> {
  if (cachedDataset) {
    return cachedDataset;
  }

  let raw: string;
  try {
    raw = await readFile(datasetPath(), "utf8");
  } catch {
    throw new InvalidWorldDatasetError(
      `missing file at data/world/${WORLD_DATASET_FILE}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidWorldDatasetError("file is not valid JSON");
  }

  cachedDataset = parseWorldDataset(parsed);
  return cachedDataset;
}

/** Test helper — clear module cache between tests if needed. */
export function resetWorldDatasetCache(): void {
  cachedDataset = null;
}

export function getWorldPlaceById(
  dataset: WorldDataset,
  placeId: string,
): WorldPlace {
  const place = dataset.places.find((entry) => entry.id === placeId);
  if (!place) {
    throw new InvalidWorldDatasetError(`unknown place id "${placeId}"`);
  }
  return place;
}
