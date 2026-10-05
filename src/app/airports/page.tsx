import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("world-airports");

export const metadata: Metadata = buildPageMetadata(page);

export default function WorldAirportsPage() {
  return (
    <>
      <GamePlay mode="world-airports" />
      <SeoCopy page={page} mode="world-airports" />
    </>
  );
}
