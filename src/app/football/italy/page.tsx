import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("football-italy");

export const metadata: Metadata = buildPageMetadata(page);

export default function FootballItalyPage() {
  return (
    <>
      <GamePlay mode="football-italy" />
      <SeoCopy page={page} mode="football-italy" />
    </>
  );
}
