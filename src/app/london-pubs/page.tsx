import type { Metadata } from "next";

import { GamePlay } from "@/components/game/GamePlay";

const title = "PIN5 · Pubs 5 · London";
const description =
  "Five clues. Five pins. Find the famous London pub. PIN5 Pubs 5 London.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "PIN5 London Pubs",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function LondonPubsPage() {
  return <GamePlay mode="london-pubs" />;
}
