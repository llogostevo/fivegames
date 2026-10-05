import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";

const title = "PIN5 ⚽ Football · UK Edition";
const description =
  "Daily PIN5 Football — find today's Football 92 home ground from five clues.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "PIN5 Football",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function FootballPage() {
  return <GamePlay mode="football" />;
}
