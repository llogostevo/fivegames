import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("star-wars");

export const metadata: Metadata = buildPageMetadata(page);

export default function StarWarsPage() {
  return (
    <>
      <GamePlay mode="star-wars" />
      <SeoCopy page={page} mode="star-wars" />
    </>
  );
}
