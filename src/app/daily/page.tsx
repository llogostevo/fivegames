import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("daily");

export const metadata: Metadata = buildPageMetadata(page);

export default function DailyPage() {
  return (
    <>
      <GamePlay mode="daily" />
      <SeoCopy page={page} mode="daily" />
    </>
  );
}
