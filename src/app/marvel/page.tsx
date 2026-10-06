import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("marvel");

export const metadata: Metadata = buildPageMetadata(page);

export default function MarvelPage() {
  return (
    <>
      <GamePlay mode="marvel" />
      <SeoCopy page={page} mode="marvel" />
    </>
  );
}
