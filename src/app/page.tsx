import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  UPCOMING_FOOTBALL_LEAGUES,
  listFootballModes,
  listPlayableModes,
  type GameModeDefinition,
} from "@/lib/game/modes";

export const metadata: Metadata = {
  title: "PIN5",
  description:
    "PIN5 — daily location games. Play Daily 5 and Football 5 across England, Italy, Germany, France, and Spain.",
};

function GameCard({
  game,
  primary = "title",
}: {
  game: GameModeDefinition;
  /** Which field leads the card heading. */
  primary?: "title" | "subtitle";
}) {
  const heading = primary === "subtitle" ? game.subtitle : game.title;
  const secondary = primary === "subtitle" ? game.title : game.subtitle;

  return (
    <Link
      href={game.path}
      className="group block rounded-2xl border border-rule/80 bg-background/90 px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            <span aria-hidden="true" className="mr-2">
              {game.emoji}
            </span>
            {heading}
            <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              {secondary}
            </span>
          </p>
          <p className="mt-2 text-sm leading-snug text-foreground/70">
            {game.detail}
          </p>
        </div>
        <span
          className="mt-1 text-lg font-semibold text-muted transition group-hover:text-foreground"
          aria-hidden="true"
        >
          →
        </span>
      </div>
    </Link>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
      {children}
    </h2>
  );
}

export default function HomePage() {
  const generalKnowledge = listPlayableModes().filter(
    (mode) => mode.family === "daily",
  );
  const football = listFootballModes();

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-[linear-gradient(165deg,#f8faf8_0%,#eef2f0_45%,#e8eef6_100%)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(21,128,61,0.12), transparent 42%), radial-gradient(circle at 80% 0%, rgba(29,78,216,0.1), transparent 36%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-10 pt-10 sm:px-8 sm:pt-14">
        <header className="mb-9">
          <div className="flex items-center gap-3">
            <Image
              src="/icon.svg"
              alt=""
              width={48}
              height={48}
              priority
              className="h-11 w-11 shrink-0 rounded-[0.7rem] sm:h-12 sm:w-12"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Location games
              </p>
              <h1 className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl">
                PIN5
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-snug text-foreground/75 sm:text-base">
            Five clues. Five pins. Find the place — or the ground.
          </p>
        </header>

        <section aria-labelledby="general-knowledge-heading" className="space-y-3">
          <SectionHeading>
            <span id="general-knowledge-heading">General knowledge</span>
          </SectionHeading>
          {generalKnowledge.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </section>

        <section aria-labelledby="football-heading" className="mt-8 space-y-3">
          <SectionHeading>
            <span id="football-heading">Football 5</span>
          </SectionHeading>
          {football.map((game) => (
            <GameCard key={game.id} game={game} primary="subtitle" />
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
      </div>
    </main>
  );
}
