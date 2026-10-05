import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";

const title = "PIN5 ⚽ Football · France";
const description =
  "Daily PIN5 Football France — find today's Ligue 1 / Ligue 2 home ground from five clues.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "PIN5 Football France",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function FootballFrancePage() {
  return <GamePlay mode="football-france" />;
}
