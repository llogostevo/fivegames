/**
 * London pubs dataset (pin5-london-pubs).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import { CLUE_COUNT } from "@/lib/game/constants";

export const LONDON_PUBS_COUNT = 25;

export const LONDON_PUBS_DATASET_FILE = "pin5-london-pubs.json";

export type LondonPub = {
  id: string;
  pub: string;
  area: string;
  borough: string;
  address: string;
  difficulty: number;
  target: { lat: number; lng: number };
  clues: string[];
};

export type LondonPubsDataset = {
  dataset: string;
  region: string;
  pubCount: number;
  pubs: LondonPub[];
};

export class InvalidLondonPubsDatasetError extends Error {
  constructor(reason: string) {
    super(`Invalid London pubs dataset: ${reason}`);
    this.name = "InvalidLondonPubsDatasetError";
  }
}

function assertNonEmptyString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new InvalidLondonPubsDatasetError(`${field} must be a non-empty string`);
  }
}

function assertCoordinate(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new InvalidLondonPubsDatasetError(`${field} must be a finite number`);
  }
  return value;
}

/** Validate a London pubs payload. Safe to call from tests. */
export function parseLondonPubsDataset(value: unknown): LondonPubsDataset {
  if (!value || typeof value !== "object") {
    throw new InvalidLondonPubsDatasetError("expected an object");
  }

  const raw = value as Record<string, unknown>;
  assertNonEmptyString(raw.dataset, "dataset");
  assertNonEmptyString(raw.region, "region");

  if (!Array.isArray(raw.pubs)) {
    throw new InvalidLondonPubsDatasetError("pubs must be an array");
  }

  if (raw.pubs.length !== LONDON_PUBS_COUNT) {
    throw new InvalidLondonPubsDatasetError(
      `expected exactly ${LONDON_PUBS_COUNT} pubs, found ${raw.pubs.length}`,
    );
  }

  if (
    typeof raw.pubCount === "number" &&
    raw.pubCount !== raw.pubs.length
  ) {
    throw new InvalidLondonPubsDatasetError(
      `pubCount (${raw.pubCount}) does not match pubs length (${raw.pubs.length})`,
    );
  }

  const seenIds = new Set<string>();
  const pubs: LondonPub[] = raw.pubs.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new InvalidLondonPubsDatasetError(`pubs[${index}] must be an object`);
    }
    const pubRaw = entry as Record<string, unknown>;

    assertNonEmptyString(pubRaw.id, `pubs[${index}].id`);
    if (seenIds.has(pubRaw.id)) {
      throw new InvalidLondonPubsDatasetError(
        `duplicate pub id "${pubRaw.id}"`,
      );
    }
    seenIds.add(pubRaw.id);

    assertNonEmptyString(pubRaw.pub, `pubs[${index}].pub`);
    assertNonEmptyString(pubRaw.area, `pubs[${index}].area`);
    assertNonEmptyString(pubRaw.borough, `pubs[${index}].borough`);
    assertNonEmptyString(pubRaw.address, `pubs[${index}].address`);

    if (
      typeof pubRaw.difficulty !== "number" ||
      !Number.isFinite(pubRaw.difficulty)
    ) {
      throw new InvalidLondonPubsDatasetError(
        `pubs[${index}].difficulty must be a finite number`,
      );
    }

    const targetRaw = pubRaw.target;
    if (!targetRaw || typeof targetRaw !== "object") {
      throw new InvalidLondonPubsDatasetError(
        `pubs[${index}].target is required`,
      );
    }
    const target = targetRaw as Record<string, unknown>;
    const lat = assertCoordinate(target.lat, `pubs[${index}].target.lat`);
    const lng = assertCoordinate(target.lng, `pubs[${index}].target.lng`);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new InvalidLondonPubsDatasetError(
        `pubs[${index}].target coordinates out of range`,
      );
    }

    if (!Array.isArray(pubRaw.clues) || pubRaw.clues.length !== CLUE_COUNT) {
      throw new InvalidLondonPubsDatasetError(
        `pubs[${index}].clues must contain exactly ${CLUE_COUNT} strings`,
      );
    }
    const clues = pubRaw.clues.map((clue, clueIndex) => {
      if (typeof clue !== "string" || clue.trim().length === 0) {
        throw new InvalidLondonPubsDatasetError(
          `pubs[${index}].clues[${clueIndex}] must be a non-empty string`,
        );
      }
      return clue;
    });

    return {
      id: pubRaw.id.trim(),
      pub: pubRaw.pub.trim(),
      area: pubRaw.area.trim(),
      borough: pubRaw.borough.trim(),
      address: pubRaw.address.trim(),
      difficulty: pubRaw.difficulty,
      target: { lat, lng },
      clues,
    };
  });

  return {
    dataset: raw.dataset.trim(),
    region: raw.region.trim(),
    pubCount: pubs.length,
    pubs,
  };
}

function datasetPath(): string {
  return path.join(
    process.cwd(),
    "data",
    "londonpubs",
    LONDON_PUBS_DATASET_FILE,
  );
}

let cachedDataset: LondonPubsDataset | null = null;

/** Load and validate the London pubs dataset (cached). Server-only. */
export async function loadLondonPubsDataset(): Promise<LondonPubsDataset> {
  if (cachedDataset) {
    return cachedDataset;
  }

  let raw: string;
  try {
    raw = await readFile(datasetPath(), "utf8");
  } catch {
    throw new InvalidLondonPubsDatasetError(
      `missing file at data/londonpubs/${LONDON_PUBS_DATASET_FILE}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidLondonPubsDatasetError("file is not valid JSON");
  }

  cachedDataset = parseLondonPubsDataset(parsed);
  return cachedDataset;
}

/** Test helper — clear module cache between tests if needed. */
export function resetLondonPubsDatasetCache(): void {
  cachedDataset = null;
}

export function getLondonPubById(
  dataset: LondonPubsDataset,
  pubId: string,
): LondonPub {
  const pub = dataset.pubs.find((entry) => entry.id === pubId);
  if (!pub) {
    throw new InvalidLondonPubsDatasetError(`unknown pub id "${pubId}"`);
  }
  return pub;
}
