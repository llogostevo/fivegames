import {
  getAvailableGameDate,
  isGameDateReleased,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";
import { GameNotFoundError } from "@/lib/game/loadGame";
import {
  getLondonPubById,
  loadLondonPubsDataset,
} from "@/lib/game/londonpubs/dataset";
import {
  LONDON_PUBS_SCHEDULE,
  londonPubsCycleIndex,
  londonPubsGameNumber,
  orderLondonPubIds,
} from "@/lib/game/londonpubs/schedule";
import type { GameDefinition } from "@/types/game";

let cachedOrderedIds: string[] | null = null;

async function getOrderedPubIds(): Promise<string[]> {
  if (cachedOrderedIds) {
    return cachedOrderedIds;
  }
  const dataset = await loadLondonPubsDataset();
  cachedOrderedIds = orderLondonPubIds(
    dataset.pubs.map((pub) => pub.id),
    LONDON_PUBS_SCHEDULE.seed,
  );
  return cachedOrderedIds;
}

/** Build a PIN5 GameDefinition for a London pub on a given date. */
export async function getLondonPubsGameByDate(
  date: string,
): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new GameNotFoundError(date);
  }

  if (date < LONDON_PUBS_SCHEDULE.cycleStartDate) {
    throw new GameNotFoundError(date);
  }

  const dataset = await loadLondonPubsDataset();
  const orderedIds = await getOrderedPubIds();
  const index = londonPubsCycleIndex(date, {
    cycleStartDate: LONDON_PUBS_SCHEDULE.cycleStartDate,
    placeCount: orderedIds.length,
  });
  const pubId = orderedIds[index]!;
  const pub = getLondonPubById(dataset, pubId);

  return {
    id: date,
    date,
    gameNumber: londonPubsGameNumber(date),
    theme: "london-pubs",
    mode: "london-pubs",
    answer: {
      name: pub.pub,
      lat: pub.target.lat,
      lng: pub.target.lng,
    },
    answerDetail: {
      city: `${pub.area}, ${pub.borough}`,
      division: pub.borough,
      clubId: pub.id,
    },
    clues: pub.clues,
  };
}

export async function getTodaysLondonPubsGame(
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getLondonPubsGameByDate(date);
}

export async function getReleasedLondonPubsGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getLondonPubsGameByDate(date);
}

/** Test helper. */
export function resetLondonPubsScheduleCache(): void {
  cachedOrderedIds = null;
}
