import {
  getAvailableGameDate,
  isGameDateReleased,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";
import { GameNotFoundError } from "@/lib/game/loadGame";
import { formatConnectionLabel } from "@/lib/game/connectionLabel";
import {
  getStarWarsPlaceById,
  loadStarWarsDataset,
} from "@/lib/game/starwars/dataset";
import {
  STAR_WARS_SCHEDULE,
  starWarsCycleIndex,
  starWarsGameNumber,
  orderStarWarsPlaceIds,
} from "@/lib/game/starwars/schedule";
import type { GameDefinition } from "@/types/game";

let cachedOrderedIds: string[] | null = null;

async function getOrderedPlaceIds(): Promise<string[]> {
  if (cachedOrderedIds) {
    return cachedOrderedIds;
  }
  const dataset = await loadStarWarsDataset();
  cachedOrderedIds = orderStarWarsPlaceIds(
    dataset.locations.map((place) => place.id),
    STAR_WARS_SCHEDULE.seed,
  );
  return cachedOrderedIds;
}

/** Build a PIN5 GameDefinition for a Star Wars place on a given date. */
export async function getStarWarsGameByDate(
  date: string,
): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new GameNotFoundError(date);
  }

  if (date < STAR_WARS_SCHEDULE.cycleStartDate) {
    throw new GameNotFoundError(date);
  }

  const dataset = await loadStarWarsDataset();
  const orderedIds = await getOrderedPlaceIds();
  const index = starWarsCycleIndex(date, {
    cycleStartDate: STAR_WARS_SCHEDULE.cycleStartDate,
    placeCount: orderedIds.length,
  });
  const placeId = orderedIds[index]!;
  const place = getStarWarsPlaceById(dataset, placeId);
  const connectionLabel = formatConnectionLabel(place.connection);

  return {
    id: date,
    date,
    gameNumber: starWarsGameNumber(date),
    theme: "star-wars",
    mode: "star-wars",
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

export async function getTodaysStarWarsGame(
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getStarWarsGameByDate(date);
}

export async function getReleasedStarWarsGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getStarWarsGameByDate(date);
}

/** Test helper. */
export function resetStarWarsScheduleCache(): void {
  cachedOrderedIds = null;
}
