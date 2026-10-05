import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";

const title = "PIN5 ⚽ Football · Germany";
const description =
  "Daily PIN5 Football Germany — find today's Bundesliga / 2. Bundesliga home ground from five clues.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "PIN5 Football Germany",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function FootballGermanyPage() {
  return <GamePlay mode="football-germany" />;
}
