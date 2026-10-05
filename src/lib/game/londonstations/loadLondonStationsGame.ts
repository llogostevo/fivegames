import {
  getAvailableGameDate,
  isGameDateReleased,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";
import { GameNotFoundError } from "@/lib/game/loadGame";
import {
  cluesForStation,
  getLondonStationById,
  loadLondonStationsDataset,
} from "@/lib/game/londonstations/dataset";
import {
  LONDON_STATIONS_SCHEDULE,
  londonStationsCycleIndex,
  londonStationsGameNumber,
  orderLondonStationIds,
} from "@/lib/game/londonstations/schedule";
import type { GameDefinition } from "@/types/game";

let cachedOrderedIds: string[] | null = null;

async function getOrderedStationIds(): Promise<string[]> {
  if (cachedOrderedIds) {
    return cachedOrderedIds;
  }
  const dataset = await loadLondonStationsDataset();
  cachedOrderedIds = orderLondonStationIds(
    dataset.stations.map((station) => station.id),
    LONDON_STATIONS_SCHEDULE.seed,
  );
  return cachedOrderedIds;
}

/** Build a PIN5 GameDefinition for a London station on a given date. */
export async function getLondonStationsGameByDate(
  date: string,
): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new GameNotFoundError(date);
  }

  if (date < LONDON_STATIONS_SCHEDULE.cycleStartDate) {
    throw new GameNotFoundError(date);
  }

  const dataset = await loadLondonStationsDataset();
  const orderedIds = await getOrderedStationIds();
  const index = londonStationsCycleIndex(date, {
    cycleStartDate: LONDON_STATIONS_SCHEDULE.cycleStartDate,
    placeCount: orderedIds.length,
  });
  const stationId = orderedIds[index]!;
  const station = getLondonStationById(dataset, stationId);

  return {
    id: date,
    date,
    gameNumber: londonStationsGameNumber(date),
    theme: "london-stations",
    mode: "london-stations",
    answer: {
      name: station.station,
      lat: station.target.lat,
      lng: station.target.lng,
    },
    answerDetail: {
      city: station.borough,
      division: station.modes.join(" · "),
      clubId: station.id,
    },
    clues: cluesForStation(station),
  };
}

export async function getTodaysLondonStationsGame(
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getLondonStationsGameByDate(date);
}

export async function getReleasedLondonStationsGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getLondonStationsGameByDate(date);
}

/** Test helper. */
export function resetLondonStationsScheduleCache(): void {
  cachedOrderedIds = null;
}
