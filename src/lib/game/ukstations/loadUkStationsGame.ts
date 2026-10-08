import {
  getAvailableGameDate,
  isGameDateReleased,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";
import { GameNotFoundError } from "@/lib/game/loadGame";
import {
  getUkRailStationById,
  loadUkRailDataset,
} from "@/lib/game/ukstations/dataset";
import {
  UK_RAIL_SCHEDULE,
  orderUkRailStationIds,
  ukRailCycleIndex,
  ukRailGameNumber,
} from "@/lib/game/ukstations/schedule";
import type { GameDefinition } from "@/types/game";

let cachedOrderedIds: string[] | null = null;

async function getOrderedStationIds(): Promise<string[]> {
  if (cachedOrderedIds) {
    return cachedOrderedIds;
  }
  const dataset = await loadUkRailDataset();
  cachedOrderedIds = orderUkRailStationIds(
    dataset.stations.map((station) => station.id),
    UK_RAIL_SCHEDULE.seed,
  );
  return cachedOrderedIds;
}

/** Build a PIN5 GameDefinition for a UK rail station on a given date. */
export async function getUkStationsGameByDate(
  date: string,
): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new GameNotFoundError(date);
  }

  if (date < UK_RAIL_SCHEDULE.cycleStartDate) {
    throw new GameNotFoundError(date);
  }

  const dataset = await loadUkRailDataset();
  const orderedIds = await getOrderedStationIds();
  const index = ukRailCycleIndex(date, {
    cycleStartDate: UK_RAIL_SCHEDULE.cycleStartDate,
    placeCount: orderedIds.length,
  });
  const stationId = orderedIds[index]!;
  const station = getUkRailStationById(dataset, stationId);

  return {
    id: date,
    date,
    gameNumber: ukRailGameNumber(date),
    theme: "uk-stations",
    mode: "uk-stations",
    answer: {
      name: station.location,
      lat: station.target.lat,
      lng: station.target.lng,
    },
    answerDetail: {
      city: station.region,
      division: station.nation,
      clubId: station.id,
    },
    clues: station.clues,
  };
}

export async function getTodaysUkStationsGame(
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getUkStationsGameByDate(date);
}

export async function getReleasedUkStationsGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getUkStationsGameByDate(date);
}

export function resetUkStationsScheduleCache(): void {
  cachedOrderedIds = null;
}
