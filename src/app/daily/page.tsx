import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";

const title = "PIN5 · Daily 5 · UK Edition";
const description =
  "Five clues. Five pins. Find the place. PIN5 Daily 5 UK Edition.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "PIN5 Daily 5",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function DailyPage() {
  return <GamePlay mode="daily" />;
}
