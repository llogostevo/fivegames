import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("football");

export const metadata: Metadata = buildPageMetadata(page);

export default function FootballEnglandPage() {
  return (
    <>
      <GamePlay mode="football" />
      <SeoCopy page={page} mode="football" />
    </>
  );
}
