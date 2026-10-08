import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("uk-stations");

export const metadata: Metadata = buildPageMetadata(page);

export default function UkStationsPage() {
  return (
    <>
      <GamePlay mode="uk-stations" />
      <SeoCopy page={page} mode="uk-stations" />
    </>
  );
}
