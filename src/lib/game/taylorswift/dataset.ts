/**
 * Taylor Swift places dataset (pin5-taylor-swift).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";

export const TAYLOR_SWIFT_COUNT = 94;

export const TAYLOR_SWIFT_DATASET_FILE = "pin5-taylor-swift.json";

export type TaylorSwiftPlace = {
  id: string;
  location: string;
  city: string;
  region: string;
  country: string;
  continent: string;
  target: { lat: number; lng: number };
  clues: string[];
  connection: string;
  eras: string[];
};

export type TaylorSwiftDataset = {
  dataset: string;
  scope: string;
  locationCount: number;
  locations: TaylorSwiftPlace[];
};

export class InvalidTaylorSwiftDatasetError extends Error {
  constructor(reason: string) {
    super(`Invalid Taylor Swift dataset: ${reason}`);
    this.name = "InvalidTaylorSwiftDatasetError";
  }
}

function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidTaylorSwiftDatasetError(
      `${field} must be a non-empty string`,
    );
  }
}

function assertCoordinate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidTaylorSwiftDatasetError(`${field} must be a finite number`);
  }
  return value;
}

/** Validate a Taylor Swift places payload. Safe to call from tests. */
export function parseTaylorSwiftDataset(value: unknown): TaylorSwiftDataset {
  if (!value || typeof value !== "object") {
    throw new InvalidTaylorSwiftDatasetError("expected an object");
  }

  const raw = value as Record<string, unknown>;
  assertNonEmptyString(raw.dataset, "dataset");
  assertNonEmptyString(raw.scope, "scope");

  if (!Array.isArray(raw.locations)) {
    throw new InvalidTaylorSwiftDatasetError("locations must be an array");
  }

  if (raw.locations.length !== TAYLOR_SWIFT_COUNT) {
    throw new InvalidTaylorSwiftDatasetError(
      `expected exactly ${TAYLOR_SWIFT_COUNT} locations, found ${raw.locations.length}`,
    );
  }

  if (
    typeof raw.locationCount === "number" &&
    raw.locationCount !== raw.locations.length
  ) {
    throw new InvalidTaylorSwiftDatasetError(
      `locationCount (${raw.locationCount}) does not match locations length (${raw.locations.length})`,
    );
  }

  const seenIds = new Set<string>();
  const locations: TaylorSwiftPlace[] = raw.locations.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidTaylorSwiftDatasetError(
        `locations[${index}] must be an object`,
      );
    }
    const placeRaw = entry as Record<string, unknown>;

    assertNonEmptyString(placeRaw.id, `locations[${index}].id`);
    if (seenIds.has(placeRaw.id)) {
      throw new InvalidTaylorSwiftDatasetError(
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
      throw new InvalidTaylorSwiftDatasetError(
        `locations[${index}].status must be "ready"`,
      );
    }

    const targetRaw = placeRaw.target;
    if (!targetRaw || typeof targetRaw !== "object") {
      throw new InvalidTaylorSwiftDatasetError(
        `locations[${index}].target is required`,
      );
    }
    const target = targetRaw as Record<string, unknown>;
    const lat = assertCoordinate(target.lat, `locations[${index}].target.lat`);
    const lng = assertCoordinate(target.lng, `locations[${index}].target.lng`);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new InvalidTaylorSwiftDatasetError(
        `locations[${index}].target coordinates out of range`,
      );
    }

    if (!Array.isArray(placeRaw.clues) || placeRaw.clues.length !== CLUE_COUNT) {
      throw new InvalidTaylorSwiftDatasetError(
        `locations[${index}].clues must contain exactly ${CLUE_COUNT} strings`,
      );
    }
    const clues = placeRaw.clues.map((clue, clueIndex) => {
      if (typeof clue !== "string" || clue.trim().length === 0) {
        throw new InvalidTaylorSwiftDatasetError(
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
    if (!Array.isArray(factsRaw.eras)) {
      throw new InvalidTaylorSwiftDatasetError(
        `locations[${index}].facts.eras must be an array`,
      );
    }
    const eras = factsRaw.eras.map((era, eraIndex) => {
      if (typeof era !== "string" || era.trim().length === 0) {
        throw new InvalidTaylorSwiftDatasetError(
          `locations[${index}].facts.eras[${eraIndex}] must be a non-empty string`,
        );
      }
      return era.trim();
    });

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
      eras,
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
    "taylorswift",
    TAYLOR_SWIFT_DATASET_FILE,
  );
}

let cachedDataset: TaylorSwiftDataset | null = null;

/** Load and validate the Taylor Swift dataset (cached). Server-only. */
export async function loadTaylorSwiftDataset(): Promise<TaylorSwiftDataset> {
  if (cachedDataset) {
    return cachedDataset;
  }

  let raw: string;
  try {
    raw = await readFile(datasetPath(), "utf8");
  } catch {
    throw new InvalidTaylorSwiftDatasetError(
      `missing file at data/taylorswift/${TAYLOR_SWIFT_DATASET_FILE}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidTaylorSwiftDatasetError("file is not valid JSON");
  }

  cachedDataset = parseTaylorSwiftDataset(parsed);
  return cachedDataset;
}

/** Test helper — clear module cache between tests if needed. */
export function resetTaylorSwiftDatasetCache(): void {
  cachedDataset = null;
}

export function getTaylorSwiftPlaceById(
  dataset: TaylorSwiftDataset,
  placeId: string,
): TaylorSwiftPlace {
  const place = dataset.locations.find((entry) => entry.id === placeId);
  if (!place) {
    throw new InvalidTaylorSwiftDatasetError(`unknown place id "${placeId}"`);
  }
  return place;
}
