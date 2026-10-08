/**
 * UK National Rail stations dataset (pin5-national-rail-stations).
 * Locations with status "ready" enter the daily cycle. "review" rows are skipped.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";

/** Playable stations (status "ready"). Review entries stay in the file but are not served. */
export const UK_RAIL_READY_COUNT = 316;

export const UK_RAIL_DATASET_FILE = "pin5-national-rail-stations.json";

export type UkRailStation = {
  id: string;
  location: string;
  city: string;
  region: string;
  nation: string;
  country: string;
  target: { lat: number; lng: number };
  clues: string[];
};

export type UkRailDataset = {
  dataset: string;
  locationCount: number;
  stations: UkRailStation[];
};

export class InvalidUkRailDatasetError extends Error {
  constructor(reason: string) {
    super(`Invalid UK rail stations dataset: ${reason}`);
    this.name = "InvalidUkRailDatasetError";
  }
}

function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidUkRailDatasetError(`${field} must be a non-empty string`);
  }
}

function assertCoordinate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidUkRailDatasetError(`${field} must be a finite number`);
  }
  return value;
}

function parseClues(raw: unknown, index: number): string[] {
  if (!Array.isArray(raw) || raw.length !== CLUE_COUNT) {
    throw new InvalidUkRailDatasetError(
      `locations[${index}].clues must contain exactly ${CLUE_COUNT} strings`,
    );
  }
  return raw.map((clue, clueIndex) => {
    if (typeof clue !== "string" || clue.trim().length === 0) {
      throw new InvalidUkRailDatasetError(
        `locations[${index}].clues[${clueIndex}] must be a non-empty string`,
      );
    }
    return clue.trim();
  });
}

/** Validate the file and return only ready stations, in file order. */
export function parseUkRailDataset(value: unknown): UkRailDataset {
  if (!value || typeof value !== "object") {
    throw new InvalidUkRailDatasetError("expected an object");
  }

  const raw = value as Record<string, unknown>;
  assertNonEmptyString(raw.dataset, "dataset");

  if (!Array.isArray(raw.locations)) {
    throw new InvalidUkRailDatasetError("locations must be an array");
  }

  if (
    typeof raw.locationCount === "number" &&
    raw.locationCount !== raw.locations.length
  ) {
    throw new InvalidUkRailDatasetError(
      `locationCount (${raw.locationCount}) does not match locations length (${raw.locations.length})`,
    );
  }

  const seenIds = new Set<string>();
  const stations: UkRailStation[] = [];

  raw.locations.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidUkRailDatasetError(
        `locations[${index}] must be an object`,
      );
    }
    const locationRaw = entry as Record<string, unknown>;
    const status = locationRaw.status;
    if (status !== "ready" && status !== "review") {
      throw new InvalidUkRailDatasetError(
        `locations[${index}].status must be "ready" or "review"`,
      );
    }

    assertNonEmptyString(locationRaw.id, `locations[${index}].id`);
    if (seenIds.has(locationRaw.id)) {
      throw new InvalidUkRailDatasetError(
        `duplicate location id "${locationRaw.id}"`,
      );
    }
    seenIds.add(locationRaw.id);

    if (status !== "ready") {
      return;
    }

    assertNonEmptyString(locationRaw.location, `locations[${index}].location`);
    assertNonEmptyString(locationRaw.city, `locations[${index}].city`);
    assertNonEmptyString(locationRaw.region, `locations[${index}].region`);
    assertNonEmptyString(locationRaw.nation, `locations[${index}].nation`);
    assertNonEmptyString(locationRaw.country, `locations[${index}].country`);

    const targetRaw = locationRaw.target;
    if (!targetRaw || typeof targetRaw !== "object") {
      throw new InvalidUkRailDatasetError(
        `locations[${index}].target is required`,
      );
    }
    const target = targetRaw as Record<string, unknown>;
    const lat = assertCoordinate(target.lat, `locations[${index}].target.lat`);
    const lng = assertCoordinate(target.lng, `locations[${index}].target.lng`);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new InvalidUkRailDatasetError(
        `locations[${index}].target coordinates out of range`,
      );
    }

    stations.push({
      id: locationRaw.id.trim(),
      location: locationRaw.location.trim(),
      city: locationRaw.city.trim(),
      region: locationRaw.region.trim(),
      nation: locationRaw.nation.trim(),
      country: locationRaw.country.trim(),
      target: { lat, lng },
      clues: parseClues(locationRaw.clues, index),
    });
  });

  if (stations.length !== UK_RAIL_READY_COUNT) {
    throw new InvalidUkRailDatasetError(
      `expected exactly ${UK_RAIL_READY_COUNT} ready stations, found ${stations.length}`,
    );
  }

  return {
    dataset: raw.dataset.trim(),
    locationCount: stations.length,
    stations,
  };
}

function datasetPath(): string {
  return path.join(
    process.cwd(),
    "data",
    "ukrailstations",
    UK_RAIL_DATASET_FILE,
  );
}

let cachedDataset: UkRailDataset | null = null;

/** Load and validate ready UK rail stations (cached). Server-only. */
export async function loadUkRailDataset(): Promise<UkRailDataset> {
  if (cachedDataset) {
    return cachedDataset;
  }

  let raw: string;
  try {
    raw = await readFile(datasetPath(), "utf8");
  } catch {
    throw new InvalidUkRailDatasetError(
      `missing file at data/ukrailstations/${UK_RAIL_DATASET_FILE}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidUkRailDatasetError("file is not valid JSON");
  }

  cachedDataset = parseUkRailDataset(parsed);
  return cachedDataset;
}

export function resetUkRailDatasetCache(): void {
  cachedDataset = null;
}

export function getUkRailStationById(
  dataset: UkRailDataset,
  stationId: string,
): UkRailStation {
  const station = dataset.stations.find((entry) => entry.id === stationId);
  if (!station) {
    throw new InvalidUkRailDatasetError(`unknown station id "${stationId}"`);
  }
  return station;
}
