/**
 * Football league configs (datasets + schedules).
 * Mode ids stay stable; england keeps legacy mode id `football`.
 */

export type FootballLeagueId =
  | "england"
  | "italy"
  | "germany"
  | "france"
  | "spain";

export type FootballLeagueMode =
  | "football"
  | "football-italy"
  | "football-germany"
  | "football-france"
  | "football-spain";

export type FootballLeagueConfig = {
  id: FootballLeagueId;
  /** PIN5 game mode that plays this league. */
  mode: FootballLeagueMode;
  /** Path under data/football/. */
  datasetFile: string;
  expectedClubCount: number;
  label: string;
  schedule: {
    version: number;
    cycleStartDate: string;
    seed: string;
  };
};

export const FOOTBALL_LEAGUES: Record<FootballLeagueId, FootballLeagueConfig> =
  {
    england: {
      id: "england",
      mode: "football",
      datasetFile: "england/pin5-football92-2026-27.json",
      expectedClubCount: 92,
      label: "Football England",
      schedule: {
        version: 1,
        cycleStartDate: "2026-09-28",
        seed: "pin5-football92-v1",
      },
    },
    italy: {
      id: "italy",
      mode: "football-italy",
      datasetFile: "italy/pin5-football-italy-2026-27.json",
      expectedClubCount: 40,
      label: "Football Italy",
      schedule: {
        version: 1,
        cycleStartDate: "2026-09-28",
        seed: "pin5-football-italy-v1",
      },
    },
    germany: {
      id: "germany",
      mode: "football-germany",
      datasetFile: "germany/pin5-football-germany-2026-27.json",
      expectedClubCount: 36,
      label: "Football Germany",
      schedule: {
        version: 1,
        cycleStartDate: "2026-09-28",
        seed: "pin5-football-germany-v1",
      },
    },
    france: {
      id: "france",
      mode: "football-france",
      datasetFile: "france/pin5-football-france-2026-27.json",
      expectedClubCount: 36,
      label: "Football France",
      schedule: {
        version: 1,
        cycleStartDate: "2026-09-28",
        seed: "pin5-football-france-v1",
      },
    },
    spain: {
      id: "spain",
      mode: "football-spain",
      datasetFile: "spain/pin5-football-spain-2026-27.json",
      expectedClubCount: 42,
      label: "Football Spain",
      schedule: {
        version: 1,
        cycleStartDate: "2026-09-28",
        seed: "pin5-football-spain-v1",
      },
    },
  };

/** @deprecated Prefer FOOTBALL_LEAGUES.england.schedule */
export const FOOTBALL_SCHEDULE = {
  version: FOOTBALL_LEAGUES.england.schedule.version,
  cycleStartDate: FOOTBALL_LEAGUES.england.schedule.cycleStartDate,
  seed: FOOTBALL_LEAGUES.england.schedule.seed,
  clubCount: FOOTBALL_LEAGUES.england.expectedClubCount,
} as const;

export function isFootballLeagueId(value: unknown): value is FootballLeagueId {
  return (
    value === "england" ||
    value === "italy" ||
    value === "germany" ||
    value === "france" ||
    value === "spain"
  );
}

export function footballLeagueForMode(
  mode: string,
): FootballLeagueId | null {
  if (mode === "football") {
    return "england";
  }
  if (mode === "football-italy") {
    return "italy";
  }
  if (mode === "football-germany") {
    return "germany";
  }
  if (mode === "football-france") {
    return "france";
  }
  if (mode === "football-spain") {
    return "spain";
  }
  return null;
}

export function getFootballLeague(
  leagueId: FootballLeagueId,
): FootballLeagueConfig {
  return FOOTBALL_LEAGUES[leagueId];
}
