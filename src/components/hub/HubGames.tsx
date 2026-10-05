"use client";

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";

import {
  emptyHubProgress,
  hubProgressForMode,
  readHubProgress,
  type HubProgressSnapshot,
  type ModeHubProgress,
} from "@/lib/game/hubProgress";
import {
  GAME_MODES,
  UPCOMING_FOOTBALL_LEAGUES,
  listFootballModes,
  listGeneralKnowledgeModes,
  type GameModeDefinition,
} from "@/lib/game/modes";
import { historyStorageKey } from "@/lib/game/playerHistory";

function SectionHeading({
  id,
  children,
  meta,
}: {
  id: string;
  children: ReactNode;
  meta?: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2
        id={id}
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
      >
        {children}
      </h2>
      {meta ? (
        <p className="text-[11px] tabular-nums text-muted">{meta}</p>
      ) : null}
    </div>
  );
}

function GameCard({
  game,
  progress,
  primary = "title",
}: {
  game: GameModeDefinition;
  progress: ModeHubProgress | null;
  primary?: "title" | "subtitle";
}) {
  const heading = primary === "subtitle" ? game.subtitle : game.title;
  const secondary = primary === "subtitle" ? game.title : game.subtitle;
  const played = progress?.playedToday === true;
  const score = progress?.todayScore ?? null;
  const streakLabel = progress?.streakLabel ?? null;

  return (
    <Link
      href={game.path}
      className={`group block rounded-2xl border px-4 py-4 transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md ${
        played
          ? "border-rule/40 bg-background/55 shadow-none"
          : "border-rule/80 bg-background/90 shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`font-display text-2xl font-bold tracking-tight ${
              played ? "text-foreground/80" : ""
            }`}
          >
            <span aria-hidden="true" className="mr-2">
              {game.emoji}
            </span>
            {heading}
            <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {secondary}
            </span>
          </p>
          {played ? (
            streakLabel ? (
              <p className="mt-1.5 text-sm text-muted">{streakLabel}</p>
            ) : null
          ) : (
            <p className="mt-1.5 text-sm leading-snug text-foreground/70">
              {game.detail}
            </p>
          )}
        </div>
        <div className="mt-0.5 flex shrink-0 flex-col items-end gap-0.5">
          {played && score !== null ? (
            <>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                Done
              </span>
              <p className="font-display text-xl font-bold tabular-nums leading-none tracking-tight text-foreground">
                {score.toLocaleString()}
                <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  pts
                </span>
              </p>
            </>
          ) : (
            <span
              className="mt-0.5 text-lg font-semibold text-muted transition group-hover:text-foreground"
              aria-hidden="true"
            >
              →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function sectionPlayedMeta(
  snapshot: HubProgressSnapshot,
  games: GameModeDefinition[],
): string | null {
  if (games.length === 0) {
    return null;
  }
  const played = games.filter(
    (game) => hubProgressForMode(snapshot, game.id)?.playedToday,
  ).length;
  return `${played}/${games.length} today`;
}

function hubStorageFingerprint(availableGameDate: string): string {
  if (typeof window === "undefined") {
    return `server:${availableGameDate}`;
  }
  const storagePart = GAME_MODES.map(
    (mode) =>
      `${mode}:${window.localStorage.getItem(historyStorageKey(mode)) ?? ""}`,
  ).join("|");
  return `${availableGameDate}::${storagePart}`;
}

const clientCache = new Map<string, HubProgressSnapshot>();
const serverCache = new Map<string, HubProgressSnapshot>();

function getHubProgressSnapshot(
  availableGameDate: string,
): HubProgressSnapshot {
  const fingerprint = hubStorageFingerprint(availableGameDate);
  const cached = clientCache.get(fingerprint);
  if (cached) {
    return cached;
  }
  const snapshot = readHubProgress(undefined, { availableGameDate });
  clientCache.set(fingerprint, snapshot);
  return snapshot;
}

function getServerHubProgressSnapshot(
  availableGameDate: string,
): HubProgressSnapshot {
  const cached = serverCache.get(availableGameDate);
  if (cached) {
    return cached;
  }
  const snapshot = emptyHubProgress(availableGameDate);
  serverCache.set(availableGameDate, snapshot);
  return snapshot;
}

function subscribeHubProgress(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const onChange = () => {
    clientCache.clear();
    onStoreChange();
  };
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}

type HubGamesProps = {
  /** Server-resolved released game date (includes dev date cookie). */
  availableGameDate: string;
};

export function HubGames({ availableGameDate }: HubGamesProps) {
  const snapshot = useSyncExternalStore(
    subscribeHubProgress,
    () => getHubProgressSnapshot(availableGameDate),
    () => getServerHubProgressSnapshot(availableGameDate),
  );
  const generalKnowledge = listGeneralKnowledgeModes();
  const football = listFootballModes();

  return (
    <>
      <section aria-labelledby="general-knowledge-heading" className="space-y-3">
        <SectionHeading
          id="general-knowledge-heading"
          meta={sectionPlayedMeta(snapshot, generalKnowledge)}
        >
          General knowledge
        </SectionHeading>
        {generalKnowledge.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            primary={game.family === "world" ? "subtitle" : "title"}
            progress={hubProgressForMode(snapshot, game.id)}
          />
        ))}
      </section>

      <section aria-labelledby="football-heading" className="mt-8 space-y-3">
        <SectionHeading
          id="football-heading"
          meta={sectionPlayedMeta(snapshot, football)}
        >
          Football 5
        </SectionHeading>
        {football.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            primary="subtitle"
            progress={hubProgressForMode(snapshot, game.id)}
          />
        ))}

        {UPCOMING_FOOTBALL_LEAGUES.length > 0 ? (
          <div className="pt-2">
            <p className="text-sm text-foreground/65">More leagues soon.</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {UPCOMING_FOOTBALL_LEAGUES.map((league) => (
                <li
                  key={league.id}
                  className="rounded-xl border border-dashed border-rule bg-background/50 px-3 py-3"
                >
                  <p className="text-sm font-semibold text-foreground/80">
                    <span aria-hidden="true" className="mr-1.5">
                      {league.emoji}
                    </span>
                    {league.subtitle}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-muted">
                    Coming soon
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </>
  );
}
