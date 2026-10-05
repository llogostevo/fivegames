import {
  getAvailableGameDate,
  isGameDateReleased,
  isValidIsoDate,
  type ClockOptions,
} from "@/lib/game/date";
import {
  getFootballClubById,
  loadFootballDataset,
} from "@/lib/game/football/dataset";
import {
  FOOTBALL_SCHEDULE,
  footballCycleIndex,
  footballGameNumber,
  orderFootballClubIds,
} from "@/lib/game/football/schedule";
import { GameNotFoundError } from "@/lib/game/loadGame";
import type { GameDefinition } from "@/types/game";

let cachedOrderedIds: string[] | null = null;

async function getOrderedClubIds(): Promise<string[]> {
  if (cachedOrderedIds) {
    return cachedOrderedIds;
  }
  const dataset = await loadFootballDataset();
  cachedOrderedIds = orderFootballClubIds(
    dataset.clubs.map((club) => club.id),
    FOOTBALL_SCHEDULE.seed,
  );
  return cachedOrderedIds;
}

/** Build a PIN5 GameDefinition for a Football club on a given date. */
export async function getFootballGameByDate(
  date: string,
): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new GameNotFoundError(date);
  }

  if (date < FOOTBALL_SCHEDULE.cycleStartDate) {
    throw new GameNotFoundError(date);
  }

  const dataset = await loadFootballDataset();
  const orderedIds = await getOrderedClubIds();
  const index = footballCycleIndex(date, {
    cycleStartDate: FOOTBALL_SCHEDULE.cycleStartDate,
    clubCount: orderedIds.length,
  });
  const clubId = orderedIds[index]!;
  const club = getFootballClubById(dataset, clubId);

  return {
    id: date,
    date,
    gameNumber: footballGameNumber(date),
    theme: "football",
    mode: "football",
    answer: {
      name: club.club,
      lat: club.target.lat,
      lng: club.target.lng,
    },
    answerDetail: {
      stadium: club.stadium,
      city: club.city,
      division: club.division,
      clubId: club.id,
    },
    clues: club.clues,
  };
}

export async function getTodaysFootballGame(
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getFootballGameByDate(date);
}

export async function getReleasedFootballGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getFootballGameByDate(date);
}

/** Test helper. */
export function resetFootballScheduleCache(): void {
  cachedOrderedIds = null;
}
