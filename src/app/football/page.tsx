import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";

export const metadata: Metadata = {
  title: "PIN5 ⚽ Football",
  description:
    "Daily PIN5 Football — find today's Football 92 home ground from five clues.",
};

export default function FootballPage() {
  return <GamePlay mode="football" />;
}
