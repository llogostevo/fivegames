import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";

const title = "PIN5 ⚽ Football · Italy";
const description =
  "Daily PIN5 Football Italy — find today's Serie A / Serie B home ground from five clues.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "PIN5 Football Italy",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function FootballItalyPage() {
  return <GamePlay mode="football-italy" />;
}
