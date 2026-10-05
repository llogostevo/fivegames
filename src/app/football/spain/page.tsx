import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("football-spain");

export const metadata: Metadata = buildPageMetadata(page);

export default function FootballSpainPage() {
  return (
    <>
      <GamePlay mode="football-spain" />
      <SeoCopy page={page} mode="football-spain" />
    </>
  );
}
