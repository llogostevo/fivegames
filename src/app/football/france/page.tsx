import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("football-france");

export const metadata: Metadata = buildPageMetadata(page);

export default function FootballFrancePage() {
  return (
    <>
      <GamePlay mode="football-france" />
      <SeoCopy page={page} mode="football-france" />
    </>
  );
}
