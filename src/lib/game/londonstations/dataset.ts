/**
 * London train & tube stations dataset (pin5-london-stations).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";

export const LONDON_STATIONS_COUNT = 470;

export const LONDON_STATIONS_DATASET_FILE = "pin5-london-stations.json";

export type LondonStation = {
  id: string;
  station: string;
  borough: string;
  modes: string[];
  target: { lat: number; lng: number };
  /** Empty until researched clue batches land; loader supplies stubs. */
  clues: string[];
};

export type LondonStationsDataset = {
  dataset: string;
  region: string;
  stationCount: number;
  stations: LondonStation[];
};

export class InvalidLondonStationsDatasetError extends Error {
  constructor(reason: string) {
    super(`Invalid London stations dataset: ${reason}`);
    this.name = "InvalidLondonStationsDatasetError";
  }
}

function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidLondonStationsDatasetError(
      `${field} must be a non-empty string`,
    );
  }
}

function assertCoordinate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidLondonStationsDatasetError(
      `${field} must be a finite number`,
    );
  }
  return value;
}

function parseClues(raw: unknown, index: number): string[] {
  if (!Array.isArray(raw)) {
    throw new InvalidLondonStationsDatasetError(
      `stations[${index}].clues must be an array`,
    );
  }
  if (raw.length === 0) {
    return [];
  }
  if (raw.length !== CLUE_COUNT) {
    throw new InvalidLondonStationsDatasetError(
      `stations[${index}].clues must be empty or contain exactly ${CLUE_COUNT} strings`,
    );
  }
  return raw.map((clue, clueIndex) => {
    if (typeof clue !== "string" || clue.trim().length === 0) {
      throw new InvalidLondonStationsDatasetError(
        `stations[${index}].clues[${clueIndex}] must be a non-empty string`,
      );
    }
    return clue;
  });
}

/** Validate a London stations payload. Safe to call from tests. */
export function parseLondonStationsDataset(
  value: unknown,
): LondonStationsDataset {
  if (!value || typeof value !== "object") {
    throw new InvalidLondonStationsDatasetError("expected an object");
  }

  const raw = value as Record<string, unknown>;
  assertNonEmptyString(raw.dataset, "dataset");
  assertNonEmptyString(raw.region, "region");

  if (!Array.isArray(raw.stations)) {
    throw new InvalidLondonStationsDatasetError("stations must be an array");
  }

  if (raw.stations.length !== LONDON_STATIONS_COUNT) {
    throw new InvalidLondonStationsDatasetError(
      `expected exactly ${LONDON_STATIONS_COUNT} stations, found ${raw.stations.length}`,
    );
  }

  if (
    typeof raw.stationCount === "number" &&
    raw.stationCount !== raw.stations.length
  ) {
    throw new InvalidLondonStationsDatasetError(
      `stationCount (${raw.stationCount}) does not match stations length (${raw.stations.length})`,
    );
  }

  const seenIds = new Set<string>();
  const stations: LondonStation[] = raw.stations.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidLondonStationsDatasetError(
        `stations[${index}] must be an object`,
      );
    }
    const stationRaw = entry as Record<string, unknown>;

    assertNonEmptyString(stationRaw.id, `stations[${index}].id`);
    if (seenIds.has(stationRaw.id)) {
      throw new InvalidLondonStationsDatasetError(
        `duplicate station id "${stationRaw.id}"`,
      );
    }
    seenIds.add(stationRaw.id);

    assertNonEmptyString(stationRaw.station, `stations[${index}].station`);
    assertNonEmptyString(stationRaw.borough, `stations[${index}].borough`);

    if (!Array.isArray(stationRaw.modes) || stationRaw.modes.length === 0) {
      throw new InvalidLondonStationsDatasetError(
        `stations[${index}].modes must be a non-empty array`,
      );
    }
    const modes = stationRaw.modes.map((mode, modeIndex) => {
      if (typeof mode !== "string" || mode.trim().length === 0) {
        throw new InvalidLondonStationsDatasetError(
          `stations[${index}].modes[${modeIndex}] must be a non-empty string`,
        );
      }
      return mode.trim();
    });

    const targetRaw = stationRaw.target;
    if (!targetRaw || typeof targetRaw !== "object") {
      throw new InvalidLondonStationsDatasetError(
        `stations[${index}].target is required`,
      );
    }
    const target = targetRaw as Record<string, unknown>;
    const lat = assertCoordinate(target.lat, `stations[${index}].target.lat`);
    const lng = assertCoordinate(target.lng, `stations[${index}].target.lng`);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new InvalidLondonStationsDatasetError(
        `stations[${index}].target coordinates out of range`,
      );
    }

    return {
      id: stationRaw.id.trim(),
      station: stationRaw.station.trim(),
      borough: stationRaw.borough.trim(),
      modes,
      target: { lat, lng },
      clues: parseClues(stationRaw.clues, index),
    };
  });

  return {
    dataset: raw.dataset.trim(),
    region: raw.region.trim(),
    stationCount: stations.length,
    stations,
  };
}

/**
 * Temporary clues from inventory fields until researched batches land.
 * Progression mirrors clueDesign in the dataset JSON.
 */
export function provisionalStationClues(station: LondonStation): string[] {
  const modeList = station.modes.join(", ");
  const modeCount = station.modes.length;
  return [
    modeCount === 1
      ? "This Greater London station is served by a single rail mode."
      : `This Greater London interchange is served by ${modeCount} rail modes.`,
    `You'll find it in the London Borough of ${station.borough}.`,
    `Services here include ${modeList}.`,
    `The station is ${station.station}.`,
    `Pin the station in ${station.borough}, Greater London.`,
  ];
}

export function cluesForStation(station: LondonStation): string[] {
  return station.clues.length === CLUE_COUNT
    ? station.clues
    : provisionalStationClues(station);
}

function datasetPath(): string {
  return path.join(
    process.cwd(),
    "data",
    "londonstations",
    LONDON_STATIONS_DATASET_FILE,
  );
}

let cachedDataset: LondonStationsDataset | null = null;

/** Load and validate the London stations dataset (cached). Server-only. */
export async function loadLondonStationsDataset(): Promise<LondonStationsDataset> {
  if (cachedDataset) {
    return cachedDataset;
  }

  let raw: string;
  try {
    raw = await readFile(datasetPath(), "utf8");
  } catch {
    throw new InvalidLondonStationsDatasetError(
      `missing file at data/londonstations/${LONDON_STATIONS_DATASET_FILE}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidLondonStationsDatasetError("file is not valid JSON");
  }

  cachedDataset = parseLondonStationsDataset(parsed);
  return cachedDataset;
}

/** Test helper — clear module cache between tests if needed. */
export function resetLondonStationsDatasetCache(): void {
  cachedDataset = null;
}

export function getLondonStationById(
  dataset: LondonStationsDataset,
  stationId: string,
): LondonStation {
  const station = dataset.stations.find((entry) => entry.id === stationId);
  if (!station) {
    throw new InvalidLondonStationsDatasetError(
      `unknown station id "${stationId}"`,
    );
  }
  return station;
}
