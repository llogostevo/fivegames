import type { Metadata } from "next";

import { CollectionPage } from "@/components/collection/CollectionPage";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  path: "/collection",
  title: "Your collection | PIN5",
  description:
    "Places you have Found or Bagged across Pin5 daily location games. Saved on this device only.",
  heading: "Your collection",
  intro:
    "Track the Pin5 places you have Found within the success threshold, and Bagged on clue 1.",
  faqs: [],
  noIndex: true,
});

export default function CollectionRoute() {
  return <CollectionPage />;
}
