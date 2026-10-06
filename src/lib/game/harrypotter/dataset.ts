/**
 * Harry Potter places dataset (pin5-harry-potter).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";

export const HARRY_POTTER_COUNT = 185;

export const HARRY_POTTER_DATASET_FILE = "pin5-harry-potter.json";

export type HarryPotterPlace = {
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

export type HarryPotterDataset = {
  dataset: string;
  scope: string;
  locationCount: number;
  locations: HarryPotterPlace[];
};

export class InvalidHarryPotterDatasetError extends Error {
  constructor(reason: string) {
    super(`Invalid Harry Potter dataset: ${reason}`);
    this.name = "InvalidHarryPotterDatasetError";
  }
}

function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidHarryPotterDatasetError(
      `${field} must be a non-empty string`,
    );
  }
}

function assertCoordinate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidHarryPotterDatasetError(
      `${field} must be a finite number`,
    );
  }
  return value;
}

function assertStringArray(
  value: unknown,
  field: string,
): string[] {
  if (!Array.isArray(value)) {
    throw new InvalidHarryPotterDatasetError(`${field} must be an array`);
  }
  return value.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new InvalidHarryPotterDatasetError(
        `${field}[${index}] must be a non-empty string`,
      );
    }
    return entry.trim();
  });
}

/** Validate a Harry Potter places payload. Safe to call from tests. */
export function parseHarryPotterDataset(value: unknown): HarryPotterDataset {
  if (!value || typeof value !== "object") {
    throw new InvalidHarryPotterDatasetError("expected an object");
  }

  const raw = value as Record<string, unknown>;
  assertNonEmptyString(raw.dataset, "dataset");
  assertNonEmptyString(raw.scope, "scope");

  if (!Array.isArray(raw.locations)) {
    throw new InvalidHarryPotterDatasetError("locations must be an array");
  }

  if (raw.locations.length !== HARRY_POTTER_COUNT) {
    throw new InvalidHarryPotterDatasetError(
      `expected exactly ${HARRY_POTTER_COUNT} locations, found ${raw.locations.length}`,
    );
  }

  if (
    typeof raw.locationCount === "number" &&
    raw.locationCount !== raw.locations.length
  ) {
    throw new InvalidHarryPotterDatasetError(
      `locationCount (${raw.locationCount}) does not match locations length (${raw.locations.length})`,
    );
  }

  const seenIds = new Set<string>();
  const locations: HarryPotterPlace[] = raw.locations.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidHarryPotterDatasetError(
        `locations[${index}] must be an object`,
      );
    }
    const placeRaw = entry as Record<string, unknown>;

    assertNonEmptyString(placeRaw.id, `locations[${index}].id`);
    if (seenIds.has(placeRaw.id)) {
      throw new InvalidHarryPotterDatasetError(
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
      throw new InvalidHarryPotterDatasetError(
        `locations[${index}].status must be "ready"`,
      );
    }

    const targetRaw = placeRaw.target;
    if (!targetRaw || typeof targetRaw !== "object") {
      throw new InvalidHarryPotterDatasetError(
        `locations[${index}].target is required`,
      );
    }
    const target = targetRaw as Record<string, unknown>;
    const lat = assertCoordinate(target.lat, `locations[${index}].target.lat`);
    const lng = assertCoordinate(target.lng, `locations[${index}].target.lng`);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new InvalidHarryPotterDatasetError(
        `locations[${index}].target coordinates out of range`,
      );
    }

    if (!Array.isArray(placeRaw.clues) || placeRaw.clues.length !== CLUE_COUNT) {
      throw new InvalidHarryPotterDatasetError(
        `locations[${index}].clues must contain exactly ${CLUE_COUNT} strings`,
      );
    }
    const clues = placeRaw.clues.map((clue, clueIndex) => {
      if (typeof clue !== "string" || clue.trim().length === 0) {
        throw new InvalidHarryPotterDatasetError(
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
  return path.join(
    process.cwd(),
    "data",
    "harrypotter",
    HARRY_POTTER_DATASET_FILE,
  );
}

let cachedDataset: HarryPotterDataset | null = null;

/** Load and validate the Harry Potter dataset (cached). Server-only. */
export async function loadHarryPotterDataset(): Promise<HarryPotterDataset> {
  if (cachedDataset) {
    return cachedDataset;
  }

  let raw: string;
  try {
    raw = await readFile(datasetPath(), "utf8");
  } catch {
    throw new InvalidHarryPotterDatasetError(
      `missing file at data/harrypotter/${HARRY_POTTER_DATASET_FILE}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidHarryPotterDatasetError("file is not valid JSON");
  }

  cachedDataset = parseHarryPotterDataset(parsed);
  return cachedDataset;
}

/** Test helper — clear module cache between tests if needed. */
export function resetHarryPotterDatasetCache(): void {
  cachedDataset = null;
}

export function getHarryPotterPlaceById(
  dataset: HarryPotterDataset,
  placeId: string,
): HarryPotterPlace {
  const place = dataset.locations.find((entry) => entry.id === placeId);
  if (!place) {
    throw new InvalidHarryPotterDatasetError(`unknown place id "${placeId}"`);
  }
  return place;
}
