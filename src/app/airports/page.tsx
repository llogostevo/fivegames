import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";

const title = "PIN5 · Airports · World";
const description =
  "Five clues. Five pins. Find the airport anywhere on Earth. PIN5 Airports.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "PIN5 Airports",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function WorldAirportsPage() {
  return <GamePlay mode="world-airports" />;
}
