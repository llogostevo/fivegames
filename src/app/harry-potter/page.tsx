import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("harry-potter");

export const metadata: Metadata = buildPageMetadata(page);

export default function HarryPotterPage() {
  return (
    <>
      <GamePlay mode="harry-potter" />
      <SeoCopy page={page} mode="harry-potter" />
    </>
  );
}
