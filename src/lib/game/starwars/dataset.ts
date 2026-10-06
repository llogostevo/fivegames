/**
 * Star Wars places dataset (pin5-star-wars).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";

export const STAR_WARS_COUNT = 145;

export const STAR_WARS_DATASET_FILE = "pin5-star-wars.json";

export type StarWarsPlace = {
  id: string;
  location: string;
  city: string;
  region: string;
  country: string;
  continent: string;
  target: { lat: number; lng: number };
  clues: string[];
  connection: string;
  productions: string[];
  inUniverse: string[];
};

export type StarWarsDataset = {
  dataset: string;
  scope: string;
  locationCount: number;
  locations: StarWarsPlace[];
};

export class InvalidStarWarsDatasetError extends Error {
  constructor(reason: string) {
    super(`Invalid Star Wars dataset: ${reason}`);
    this.name = "InvalidStarWarsDatasetError";
  }
}

function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidStarWarsDatasetError(`${field} must be a non-empty string`);
  }
}

function assertCoordinate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidStarWarsDatasetError(`${field} must be a finite number`);
  }
  return value;
}

function assertStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new InvalidStarWarsDatasetError(`${field} must be an array`);
  }
  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new InvalidStarWarsDatasetError(
        `${field}[${index}] must be a non-empty string`,
      );
    }
    return entry.trim();
  });
}

/** Validate a Star Wars places payload. Safe to call from tests. */
export function parseStarWarsDataset(value: unknown): StarWarsDataset {
  if (!value || typeof value !== "object") {
    throw new InvalidStarWarsDatasetError("expected an object");
  }

  const raw = value as Record<string, unknown>;
  assertNonEmptyString(raw.dataset, "dataset");
  assertNonEmptyString(raw.scope, "scope");

  if (!Array.isArray(raw.locations)) {
    throw new InvalidStarWarsDatasetError("locations must be an array");
  }

  if (raw.locations.length !== STAR_WARS_COUNT) {
    throw new InvalidStarWarsDatasetError(
      `expected exactly ${STAR_WARS_COUNT} locations, found ${raw.locations.length}`,
    );
  }

  if (
    typeof raw.locationCount === "number" &&
    raw.locationCount !== raw.locations.length
  ) {
    throw new InvalidStarWarsDatasetError(
      `locationCount (${raw.locationCount}) does not match locations length (${raw.locations.length})`,
    );
  }

  const seenIds = new Set<string>();
  const locations: StarWarsPlace[] = raw.locations.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidStarWarsDatasetError(
        `locations[${index}] must be an object`,
      );
    }
    const placeRaw = entry as Record<string, unknown>;

    assertNonEmptyString(placeRaw.id, `locations[${index}].id`);
    if (seenIds.has(placeRaw.id)) {
      throw new InvalidStarWarsDatasetError(
        `duplicate location id "${placeRaw.id}"`,
      );
    }
    seenIds.add(placeRaw.id);

    assertNonEmptyString(placeRaw.location, `locations[${index}].location`);
    assertNonEmptyString(placeRaw.city, `locations[${index}].city`);
    assertNonEmptyString(placeRaw.region, `locations[${index}].region`);
    assertNonEmptyString(placeRaw.country, `locations[${index}].country`);
    assertNonEmptyString(placeRaw.continent, `locations[${index}].continent`);

    if (placeRaw.status !== "ready") {
      throw new InvalidStarWarsDatasetError(
        `locations[${index}].status must be "ready"`,
      );
    }

    const targetRaw = placeRaw.target;
    if (!targetRaw || typeof targetRaw !== "object") {
      throw new InvalidStarWarsDatasetError(
        `locations[${index}].target is required`,
      );
    }
    const target = targetRaw as Record<string, unknown>;
    const lat = assertCoordinate(target.lat, `locations[${index}].target.lat`);
    const lng = assertCoordinate(target.lng, `locations[${index}].target.lng`);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new InvalidStarWarsDatasetError(
        `locations[${index}].target coordinates out of range`,
      );
    }

    if (!Array.isArray(placeRaw.clues) || placeRaw.clues.length !== CLUE_COUNT) {
      throw new InvalidStarWarsDatasetError(
        `locations[${index}].clues must contain exactly ${CLUE_COUNT} strings`,
      );
    }
    const clues = placeRaw.clues.map((clue, clueIndex) => {
      if (typeof clue !== "string" || clue.trim().length === 0) {
        throw new InvalidStarWarsDatasetError(
          `locations[${index}].clues[${clueIndex}] must be a non-empty string`,
        );
      }
      return clue;
    });

    const factsRaw =
      placeRaw.facts && typeof placeRaw.facts === "object"
        ? (placeRaw.facts as Record<string, unknown>)
        : {};
    assertNonEmptyString(
      factsRaw.connection,
      `locations[${index}].facts.connection`,
    );
    const productions = assertStringArray(
      factsRaw.productions ?? [],
      `locations[${index}].facts.productions`,
    );
    const inUniverse = assertStringArray(
      factsRaw.inUniverse ?? [],
      `locations[${index}].facts.inUniverse`,
    );

    return {
      id: placeRaw.id.trim(),
      location: placeRaw.location.trim(),
      city: placeRaw.city.trim(),
      region: placeRaw.region.trim(),
      country: placeRaw.country.trim(),
      continent: placeRaw.continent.trim(),
      target: { lat, lng },
      clues,
      connection: factsRaw.connection.trim(),
      productions,
      inUniverse,
    };
  });

  return {
    dataset: raw.dataset.trim(),
    scope: raw.scope.trim(),
    locationCount: locations.length,
    locations,
  };
}

function datasetPath(): string {
  return path.join(process.cwd(), "data", "starwars", STAR_WARS_DATASET_FILE);
}

let cachedDataset: StarWarsDataset | null = null;

/** Load and validate the Star Wars dataset (cached). Server-only. */
export async function loadStarWarsDataset(): Promise<StarWarsDataset> {
  if (cachedDataset) {
    return cachedDataset;
  }

  let raw: string;
  try {
    raw = await readFile(datasetPath(), "utf8");
  } catch {
    throw new InvalidStarWarsDatasetError(
      `missing file at data/starwars/${STAR_WARS_DATASET_FILE}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidStarWarsDatasetError("file is not valid JSON");
  }

  cachedDataset = parseStarWarsDataset(parsed);
  return cachedDataset;
}

/** Test helper — clear module cache between tests if needed. */
export function resetStarWarsDatasetCache(): void {
  cachedDataset = null;
}

export function getStarWarsPlaceById(
  dataset: StarWarsDataset,
  placeId: string,
): StarWarsPlace {
  const place = dataset.locations.find((entry) => entry.id === placeId);
  if (!place) {
    throw new InvalidStarWarsDatasetError(`unknown place id "${placeId}"`);
  }
  return place;
}
