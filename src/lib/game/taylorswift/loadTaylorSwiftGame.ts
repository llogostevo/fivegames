import {
  getAvailableGameDate,
  isGameDateReleased,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";
import { GameNotFoundError } from "@/lib/game/loadGame";
import {
  getTaylorSwiftPlaceById,
  loadTaylorSwiftDataset,
} from "@/lib/game/taylorswift/dataset";
import {
  TAYLOR_SWIFT_SCHEDULE,
  orderTaylorSwiftPlaceIds,
  taylorSwiftCycleIndex,
  taylorSwiftGameNumber,
} from "@/lib/game/taylorswift/schedule";
import type { GameDefinition } from "@/types/game";

let cachedOrderedIds: string[] | null = null;

async function getOrderedPlaceIds(): Promise<string[]> {
  if (cachedOrderedIds) {
    return cachedOrderedIds;
  }
  const dataset = await loadTaylorSwiftDataset();
  cachedOrderedIds = orderTaylorSwiftPlaceIds(
    dataset.locations.map((place) => place.id),
    TAYLOR_SWIFT_SCHEDULE.seed,
  );
  return cachedOrderedIds;
}

/** Build a PIN5 GameDefinition for a Taylor Swift place on a given date. */
export async function getTaylorSwiftGameByDate(
  date: string,
): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new GameNotFoundError(date);
  }

  if (date < TAYLOR_SWIFT_SCHEDULE.cycleStartDate) {
    throw new GameNotFoundError(date);
  }

  const dataset = await loadTaylorSwiftDataset();
  const orderedIds = await getOrderedPlaceIds();
  const index = taylorSwiftCycleIndex(date, {
    cycleStartDate: TAYLOR_SWIFT_SCHEDULE.cycleStartDate,
    placeCount: orderedIds.length,
  });
  const placeId = orderedIds[index]!;
  const place = getTaylorSwiftPlaceById(dataset, placeId);

  return {
    id: date,
    date,
    gameNumber: taylorSwiftGameNumber(date),
    theme: "taylor-swift",
    mode: "taylor-swift",
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
    clues: place.clues,
  };
}

export async function getTodaysTaylorSwiftGame(
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getTaylorSwiftGameByDate(date);
}

export async function getReleasedTaylorSwiftGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getTaylorSwiftGameByDate(date);
}

/** Test helper. */
export function resetTaylorSwiftScheduleCache(): void {
  cachedOrderedIds = null;
}
