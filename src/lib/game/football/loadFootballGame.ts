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
  FOOTBALL_LEAGUES,
  type FootballLeagueId,
} from "@/lib/game/football/leagues";
import {
  footballCycleIndex,
  footballGameNumber,
  orderFootballClubIds,
} from "@/lib/game/football/schedule";
import { GameNotFoundError } from "@/lib/game/loadGame";
import type { GameDefinition } from "@/types/game";

const cachedOrderedIds = new Map<FootballLeagueId, string[]>();

async function getOrderedClubIds(
  leagueId: FootballLeagueId,
): Promise<string[]> {
  const cached = cachedOrderedIds.get(leagueId);
  if (cached) {
    return cached;
  }
  const league = FOOTBALL_LEAGUES[leagueId];
  const dataset = await loadFootballDataset(leagueId);
  const ordered = orderFootballClubIds(
    dataset.clubs.map((club) => club.id),
    league.schedule.seed,
  );
  cachedOrderedIds.set(leagueId, ordered);
  return ordered;
}

/** Build a PIN5 GameDefinition for a Football club on a given date. */
export async function getFootballGameByDate(
  date: string,
  leagueId: FootballLeagueId = "england",
): Promise<GameDefinition> {
  if (!isValidIsoDate(date)) {
    throw new GameNotFoundError(date);
  }

  const league = FOOTBALL_LEAGUES[leagueId];
  if (date < league.schedule.cycleStartDate) {
    throw new GameNotFoundError(date);
  }

  const dataset = await loadFootballDataset(leagueId);
  const orderedIds = await getOrderedClubIds(leagueId);
  const index = footballCycleIndex(date, {
    cycleStartDate: league.schedule.cycleStartDate,
    clubCount: orderedIds.length,
  });
  const clubId = orderedIds[index]!;
  const club = getFootballClubById(dataset, clubId);

  return {
    id: date,
    date,
    gameNumber: footballGameNumber(date, leagueId),
    theme: "football",
    mode: league.mode,
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
  leagueId: FootballLeagueId = "england",
): Promise<GameDefinition> {
  const date = getAvailableGameDate(now, options);
  return getFootballGameByDate(date, leagueId);
}

export async function getReleasedFootballGameByDate(
  date: string,
  now: Date = new Date(),
  options: ClockOptions = {},
  leagueId: FootballLeagueId = "england",
): Promise<GameDefinition> {
  if (!isGameDateReleased(date, now, options)) {
    throw new GameNotFoundError(date);
  }
  return getFootballGameByDate(date, leagueId);
}

/** Test helper. */
export function resetFootballScheduleCache(
  leagueId?: FootballLeagueId,
): void {
  if (leagueId) {
    cachedOrderedIds.delete(leagueId);
    return;
  }
  cachedOrderedIds.clear();
}
