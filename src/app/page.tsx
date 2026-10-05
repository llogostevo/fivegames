import type { Metadata } from "next";

import { HubGames } from "@/components/hub/HubGames";
import { Pin5Mark } from "@/components/hub/Pin5Mark";
import { SeoCopy } from "@/components/seo/SeoCopy";
import {
  getAvailableGameDate,
  getNextReleaseAt,
} from "@/lib/game/date";
import { getRequestClockOptions } from "@/lib/game/devClock";
import { buildPageMetadata, HUB_SEO } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata(HUB_SEO);

export default async function HomePage() {
  const clockOptions = await getRequestClockOptions();
  const now = new Date();
  const availableGameDate = getAvailableGameDate(now, clockOptions);
  const nextReleaseAt = getNextReleaseAt(now, clockOptions).toISOString();

  return (
    <main className="relative flex min-h-dvh flex-1 flex-col bg-[#f3f4f1]">
      <div className="relative mx-auto flex w-full max-w-[960px] flex-1 flex-col px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10">
        <header className="mb-5 sm:mb-6">
          <div className="flex items-center gap-3.5">
            <Pin5Mark className="h-14 w-14 shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-[2.35rem] font-bold leading-none tracking-tight text-[#1d1d1f] sm:text-[2.75rem]">
                PIN5
              </h1>
              <p className="mt-1 text-[0.95rem] leading-snug text-[#5f6368] sm:text-base">
                Daily location games — five clues, five pins, one place
              </p>
            </div>
          </div>
        </header>

        <HubGames
          availableGameDate={availableGameDate}
          nextReleaseAt={nextReleaseAt}
        />
      </div>

      <SeoCopy page={HUB_SEO} includeWebsiteSchema headingLevel={2} />
    </main>
  );
}
