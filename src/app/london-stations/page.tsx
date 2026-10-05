import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";

const title = "PIN5 · Train & Tube · London";
const description =
  "Five clues. Five pins. Find the London train or tube station. PIN5 Train & Tube.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "PIN5 Train & Tube",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function LondonStationsPage() {
  return <GamePlay mode="london-stations" />;
}
