import {
  getAvailableGameDate,
  isGameDateReleased,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";
import { GameNotFoundError } from "@/lib/game/loadGame";
import {
  getWorldPlaceById,
  loadWorldDataset,
} from "@/lib/game/world/dataset";
import {
  WORLD_SCHEDULE,
  orderWorldPlaceIds,
  worldCycleIndex,
  worldGameNumber,
} from "@/lib/game/world/schedule";
import type { GameDefinition } from "@/types/game";

let cachedOrderedIds: string[] | null = null;

async function getOrderedPlaceIds(): Promise<string[]> {
  if (cachedOrderedIds) {
    return cachedOrderedIds;
  }
  const dataset = await loadWorldDataset();
  cachedOrderedIds = orderWorldPlaceIds(
    dataset.places.map((place) => place.id),
    WORLD_SCHEDULE.seed,
  );
  return cachedOrderedIds;
}

/** Build a PIN5 GameDefinition for a World place on a given date. */
export async function getWorldGameByDate(date: string): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new GameNotFoundError(date);
  }

  if (date < WORLD_SCHEDULE.cycleStartDate) {
    throw new GameNotFoundError(date);
  }

  const dataset = await loadWorldDataset();
  const orderedIds = await getOrderedPlaceIds();
  const index = worldCycleIndex(date, {
    cycleStartDate: WORLD_SCHEDULE.cycleStartDate,
    placeCount: orderedIds.length,
  });
  const placeId = orderedIds[index]!;
  const place = getWorldPlaceById(dataset, placeId);

  return {
    id: date,
    date,
    gameNumber: worldGameNumber(date),
    theme: "world",
    mode: "world",
    answer: {
      name: place.name,
      lat: place.target.lat,
      lng: place.target.lng,
    },
    answerDetail: {
      city: place.country,
      division: place.region,
      clubId: place.id,
    },
    clues: place.clues,
  };
}

export async function getTodaysWorldGame(
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getWorldGameByDate(date);
}

export async function getReleasedWorldGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getWorldGameByDate(date);
}

/** Test helper. */
export function resetWorldScheduleCache(): void {
  cachedOrderedIds = null;
}
