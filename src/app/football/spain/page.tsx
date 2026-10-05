import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";

const title = "PIN5 ⚽ Football · Spain";
const description =
  "Daily PIN5 Football Spain — find today's LaLiga / Segunda División home ground from five clues.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "PIN5 Football Spain",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function FootballSpainPage() {
  return <GamePlay mode="football-spain" />;
}
