import {
  getAvailableGameDate,
  isGameDateReleased,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";
import { GameNotFoundError } from "@/lib/game/loadGame";
import { formatConnectionLabel } from "@/lib/game/connectionLabel";
import {
  getMarvelPlaceById,
  loadMarvelDataset,
} from "@/lib/game/marvel/dataset";
import {
  MARVEL_SCHEDULE,
  marvelCycleIndex,
  marvelGameNumber,
  orderMarvelPlaceIds,
} from "@/lib/game/marvel/schedule";
import type { GameDefinition } from "@/types/game";

let cachedOrderedIds: string[] | null = null;

async function getOrderedPlaceIds(): Promise<string[]> {
  if (cachedOrderedIds) {
    return cachedOrderedIds;
  }
  const dataset = await loadMarvelDataset();
  cachedOrderedIds = orderMarvelPlaceIds(
    dataset.locations.map((place) => place.id),
    MARVEL_SCHEDULE.seed,
  );
  return cachedOrderedIds;
}

/** Build a PIN5 GameDefinition for a Marvel place on a given date. */
export async function getMarvelGameByDate(
  date: string,
): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new GameNotFoundError(date);
  }

  if (date < MARVEL_SCHEDULE.cycleStartDate) {
    throw new GameNotFoundError(date);
  }

  const dataset = await loadMarvelDataset();
  const orderedIds = await getOrderedPlaceIds();
  const index = marvelCycleIndex(date, {
    cycleStartDate: MARVEL_SCHEDULE.cycleStartDate,
    placeCount: orderedIds.length,
  });
  const placeId = orderedIds[index]!;
  const place = getMarvelPlaceById(dataset, placeId);
  const connectionLabel = formatConnectionLabel(place.connection);

  return {
    id: date,
    date,
    gameNumber: marvelGameNumber(date),
    theme: "marvel",
    mode: "marvel",
    answer: {
      name: place.location,
      lat: place.target.lat,
      lng: place.target.lng,
    },
    answerDetail: {
      city: `${place.city}, ${place.country}`,
      division: place.region,
      clubId: place.id,
    },
    ...(connectionLabel ? { connectionLabel } : {}),
    clues: place.clues,
  };
}

export async function getTodaysMarvelGame(
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getMarvelGameByDate(date);
}

export async function getReleasedMarvelGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getMarvelGameByDate(date);
}

/** Test helper. */
export function resetMarvelScheduleCache(): void {
  cachedOrderedIds = null;
}
