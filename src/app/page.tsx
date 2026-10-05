import type { Metadata } from "next";

import { HubGames } from "@/components/hub/HubGames";
import { Pin5Mark } from "@/components/hub/Pin5Mark";
import { getAvailableGameDate } from "@/lib/game/date";
import { getRequestClockOptions } from "@/lib/game/devClock";

export const metadata: Metadata = {
  title: "PIN5",
  description:
    "PIN5 — daily location games. Play Daily 5 UK, World, and Football 5 across England, Italy, Germany, France, and Spain.",
};

export default async function HomePage() {
  const clockOptions = await getRequestClockOptions();
  const availableGameDate = getAvailableGameDate(new Date(), clockOptions);

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col overflow-hidden bg-[#f4f5f2]">
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-10 pt-10 sm:px-8 sm:pt-14">
        <header className="mb-10">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <Pin5Mark className="h-[3.25rem] w-[3.25rem] shrink-0 sm:h-[3.75rem] sm:w-[3.75rem]" />
            <div className="min-w-0 pt-0.5">
              <h1 className="font-display text-[2.35rem] font-bold leading-none tracking-tight text-[#1d1d1b] sm:text-[2.75rem]">
                PIN5
              </h1>
              <p className="mt-1.5 text-[0.95rem] leading-snug text-[#555d5f] sm:text-base">
                Five clues. Five pins. Find the place!
              </p>
            </div>
          </div>
        </header>

        <HubGames availableGameDate={availableGameDate} />
      </div>
    </main>
  );
}
