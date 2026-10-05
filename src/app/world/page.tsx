import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("world");

export const metadata: Metadata = buildPageMetadata(page);

export default function WorldPage() {
  return (
    <>
      <GamePlay mode="world" />
      <SeoCopy page={page} mode="world" />
    </>
  );
}
