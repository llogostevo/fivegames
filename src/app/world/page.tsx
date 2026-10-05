import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";

const title = "PIN5 · Daily 5 · World";
const description =
  "Five clues. Five pins. Find the place anywhere on Earth. PIN5 Daily 5 World.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "PIN5 Daily 5 World",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function WorldPage() {
  return <GamePlay mode="world" />;
}
