import {
  getAvailableGameDate,
  isGameDateReleased,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";
import { GameNotFoundError } from "@/lib/game/loadGame";
import {
  getHarryPotterPlaceById,
  loadHarryPotterDataset,
} from "@/lib/game/harrypotter/dataset";
import {
  HARRY_POTTER_SCHEDULE,
  harryPotterCycleIndex,
  harryPotterGameNumber,
  orderHarryPotterPlaceIds,
} from "@/lib/game/harrypotter/schedule";
import { formatConnectionLabel } from "@/lib/game/connectionLabel";
import type { GameDefinition } from "@/types/game";

let cachedOrderedIds: string[] | null = null;

async function getOrderedPlaceIds(): Promise<string[]> {
  if (cachedOrderedIds) {
    return cachedOrderedIds;
  }
  const dataset = await loadHarryPotterDataset();
  cachedOrderedIds = orderHarryPotterPlaceIds(
    dataset.locations.map((place) => place.id),
    HARRY_POTTER_SCHEDULE.seed,
  );
  return cachedOrderedIds;
}

/** Build a PIN5 GameDefinition for a Harry Potter place on a given date. */
export async function getHarryPotterGameByDate(
  date: string,
): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new GameNotFoundError(date);
  }

  if (date < HARRY_POTTER_SCHEDULE.cycleStartDate) {
    throw new GameNotFoundError(date);
  }

  const dataset = await loadHarryPotterDataset();
  const orderedIds = await getOrderedPlaceIds();
  const index = harryPotterCycleIndex(date, {
    cycleStartDate: HARRY_POTTER_SCHEDULE.cycleStartDate,
    placeCount: orderedIds.length,
  });
  const placeId = orderedIds[index]!;
  const place = getHarryPotterPlaceById(dataset, placeId);
  const connectionLabel = formatConnectionLabel(place.connection);

  return {
    id: date,
    date,
    gameNumber: harryPotterGameNumber(date),
    theme: "harry-potter",
    mode: "harry-potter",
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

export async function getTodaysHarryPotterGame(
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getHarryPotterGameByDate(date);
}

export async function getReleasedHarryPotterGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getHarryPotterGameByDate(date);
}

/** Test helper. */
export function resetHarryPotterScheduleCache(): void {
  cachedOrderedIds = null;
}
