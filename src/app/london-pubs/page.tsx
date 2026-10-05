import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("london-pubs");

export const metadata: Metadata = buildPageMetadata(page);

export default function LondonPubsPage() {
  return (
    <>
      <GamePlay mode="london-pubs" />
      <SeoCopy page={page} mode="london-pubs" />
    </>
  );
}
