import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";
import { SeoCopy } from "@/components/seo/SeoCopy";
import { buildPageMetadata, seoForMode } from "@/lib/seo";

const page = seoForMode("taylor-swift");

export const metadata: Metadata = buildPageMetadata(page);

export default function TaylorSwiftPage() {
  return (
    <>
      <GamePlay mode="taylor-swift" />
      <SeoCopy page={page} mode="taylor-swift" />
    </>
  );
}
