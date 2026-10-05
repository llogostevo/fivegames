/**
 * World airports dataset (pin5-airports).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";

export const WORLD_AIRPORTS_COUNT = 890;

export const WORLD_AIRPORTS_DATASET_FILE = "pin5-airports.json";

export type WorldAirport = {
  id: string;
  airport: string;
  iata: string;
  icao: string;
  city: string;
  region: string;
  country: string;
  continent: string;
  target: { lat: number; lng: number };
  clues: string[];
};

export type WorldAirportsDataset = {
  dataset: string;
  airportCount: number;
  airports: WorldAirport[];
};

export class InvalidWorldAirportsDatasetError extends Error {
  constructor(reason: string) {
    super(`Invalid World airports dataset: ${reason}`);
    this.name = "InvalidWorldAirportsDatasetError";
  }
}

function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidWorldAirportsDatasetError(
      `${field} must be a non-empty string`,
    );
  }
}

function assertCoordinate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidWorldAirportsDatasetError(
      `${field} must be a finite number`,
    );
  }
  return value;
}

/** Validate a World airports payload. Safe to call from tests. */
export function parseWorldAirportsDataset(
  value: unknown,
): WorldAirportsDataset {
  if (!value || typeof value !== "object") {
    throw new InvalidWorldAirportsDatasetError("expected an object");
  }

  const raw = value as Record<string, unknown>;
  assertNonEmptyString(raw.dataset, "dataset");

  if (!Array.isArray(raw.airports)) {
    throw new InvalidWorldAirportsDatasetError("airports must be an array");
  }

  if (raw.airports.length !== WORLD_AIRPORTS_COUNT) {
    throw new InvalidWorldAirportsDatasetError(
      `expected exactly ${WORLD_AIRPORTS_COUNT} airports, found ${raw.airports.length}`,
    );
  }

  if (
    typeof raw.airportCount === "number" &&
    raw.airportCount !== raw.airports.length
  ) {
    throw new InvalidWorldAirportsDatasetError(
      `airportCount (${raw.airportCount}) does not match airports length (${raw.airports.length})`,
    );
  }

  const seenIds = new Set<string>();
  const airports: WorldAirport[] = raw.airports.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidWorldAirportsDatasetError(
        `airports[${index}] must be an object`,
      );
    }
    const airportRaw = entry as Record<string, unknown>;

    assertNonEmptyString(airportRaw.id, `airports[${index}].id`);
    if (seenIds.has(airportRaw.id)) {
      throw new InvalidWorldAirportsDatasetError(
        `duplicate airport id "${airportRaw.id}"`,
      );
    }
    seenIds.add(airportRaw.id);

    assertNonEmptyString(airportRaw.airport, `airports[${index}].airport`);
    assertNonEmptyString(airportRaw.iata, `airports[${index}].iata`);
    assertNonEmptyString(airportRaw.icao, `airports[${index}].icao`);
    assertNonEmptyString(airportRaw.city, `airports[${index}].city`);
    assertNonEmptyString(airportRaw.region, `airports[${index}].region`);
    assertNonEmptyString(airportRaw.country, `airports[${index}].country`);
    assertNonEmptyString(airportRaw.continent, `airports[${index}].continent`);

    const targetRaw = airportRaw.target;
    if (!targetRaw || typeof targetRaw !== "object") {
      throw new InvalidWorldAirportsDatasetError(
        `airports[${index}].target is required`,
      );
    }
    const target = targetRaw as Record<string, unknown>;
    const lat = assertCoordinate(target.lat, `airports[${index}].target.lat`);
    const lng = assertCoordinate(target.lng, `airports[${index}].target.lng`);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new InvalidWorldAirportsDatasetError(
        `airports[${index}].target coordinates out of range`,
      );
    }

    if (
      !Array.isArray(airportRaw.clues) ||
      airportRaw.clues.length !== CLUE_COUNT
    ) {
      throw new InvalidWorldAirportsDatasetError(
        `airports[${index}].clues must contain exactly ${CLUE_COUNT} strings`,
      );
    }
    const clues = airportRaw.clues.map((clue, clueIndex) => {
      if (typeof clue !== "string" || clue.trim().length === 0) {
        throw new InvalidWorldAirportsDatasetError(
          `airports[${index}].clues[${clueIndex}] must be a non-empty string`,
        );
      }
      return clue;
    });

    return {
      id: airportRaw.id.trim(),
      airport: airportRaw.airport.trim(),
      iata: airportRaw.iata.trim().toUpperCase(),
      icao: airportRaw.icao.trim().toUpperCase(),
      city: airportRaw.city.trim(),
      region: airportRaw.region.trim(),
      country: airportRaw.country.trim(),
      continent: airportRaw.continent.trim(),
      target: { lat, lng },
      clues,
    };
  });

  return {
    dataset: raw.dataset.trim(),
    airportCount: airports.length,
    airports,
  };
}

function datasetPath(): string {
  return path.join(
    process.cwd(),
    "data",
    "worldairports",
    WORLD_AIRPORTS_DATASET_FILE,
  );
}

let cachedDataset: WorldAirportsDataset | null = null;

/** Load and validate the World airports dataset (cached). Server-only. */
export async function loadWorldAirportsDataset(): Promise<WorldAirportsDataset> {
  if (cachedDataset) {
    return cachedDataset;
  }

  let raw: string;
  try {
    raw = await readFile(datasetPath(), "utf8");
  } catch {
    throw new InvalidWorldAirportsDatasetError(
      `missing file at data/worldairports/${WORLD_AIRPORTS_DATASET_FILE}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidWorldAirportsDatasetError("file is not valid JSON");
  }

  cachedDataset = parseWorldAirportsDataset(parsed);
  return cachedDataset;
}

/** Test helper — clear module cache between tests if needed. */
export function resetWorldAirportsDatasetCache(): void {
  cachedDataset = null;
}

export function getWorldAirportById(
  dataset: WorldAirportsDataset,
  airportId: string,
): WorldAirport {
  const airport = dataset.airports.find((entry) => entry.id === airportId);
  if (!airport) {
    throw new InvalidWorldAirportsDatasetError(
      `unknown airport id "${airportId}"`,
    );
  }
  return airport;
}
