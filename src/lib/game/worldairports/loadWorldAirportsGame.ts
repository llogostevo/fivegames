import {
  getAvailableGameDate,
  isGameDateReleased,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";
import { GameNotFoundError } from "@/lib/game/loadGame";
import {
  getWorldAirportById,
  loadWorldAirportsDataset,
} from "@/lib/game/worldairports/dataset";
import {
  WORLD_AIRPORTS_SCHEDULE,
  orderWorldAirportIds,
  worldAirportsCycleIndex,
  worldAirportsGameNumber,
} from "@/lib/game/worldairports/schedule";
import type { GameDefinition } from "@/types/game";

let cachedOrderedIds: string[] | null = null;

async function getOrderedAirportIds(): Promise<string[]> {
  if (cachedOrderedIds) {
    return cachedOrderedIds;
  }
  const dataset = await loadWorldAirportsDataset();
  cachedOrderedIds = orderWorldAirportIds(
    dataset.airports.map((airport) => airport.id),
    WORLD_AIRPORTS_SCHEDULE.seed,
  );
  return cachedOrderedIds;
}

/** Build a PIN5 GameDefinition for a World airport on a given date. */
export async function getWorldAirportsGameByDate(
  date: string,
): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new GameNotFoundError(date);
  }

  if (date < WORLD_AIRPORTS_SCHEDULE.cycleStartDate) {
    throw new GameNotFoundError(date);
  }

  const dataset = await loadWorldAirportsDataset();
  const orderedIds = await getOrderedAirportIds();
  const index = worldAirportsCycleIndex(date, {
    cycleStartDate: WORLD_AIRPORTS_SCHEDULE.cycleStartDate,
    placeCount: orderedIds.length,
  });
  const airportId = orderedIds[index]!;
  const airport = getWorldAirportById(dataset, airportId);

  return {
    id: date,
    date,
    gameNumber: worldAirportsGameNumber(date),
    theme: "world-airports",
    mode: "world-airports",
    answer: {
      name: airport.airport,
      lat: airport.target.lat,
      lng: airport.target.lng,
    },
    answerDetail: {
      city: `${airport.city}, ${airport.country}`,
      division: airport.iata,
      clubId: airport.id,
    },
    clues: airport.clues,
  };
}

export async function getTodaysWorldAirportsGame(
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getWorldAirportsGameByDate(date);
}

export async function getReleasedWorldAirportsGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getWorldAirportsGameByDate(date);
}

/** Test helper. */
export function resetWorldAirportsScheduleCache(): void {
  cachedOrderedIds = null;
}
