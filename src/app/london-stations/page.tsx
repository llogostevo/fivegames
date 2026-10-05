import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("london-stations");

export const metadata: Metadata = buildPageMetadata(page);

export default function LondonStationsPage() {
  return (
    <>
      <GamePlay mode="london-stations" />
      <SeoCopy page={page} mode="london-stations" />
    </>
  );
}
