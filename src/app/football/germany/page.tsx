import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("football-germany");

export const metadata: Metadata = buildPageMetadata(page);

export default function FootballGermanyPage() {
  return (
    <>
      <GamePlay mode="football-germany" />
      <SeoCopy page={page} mode="football-germany" />
    </>
  );
}
