/**
 * Controllable SEO copy + metadata for hub and game routes.
 */

import type { Metadata } from "next";

import {
  GAME_MODE_DEFINITIONS,
  GAME_MODES,
  type GameMode,
} from "@/lib/game/modes";
import { SITE_URL } from "@/lib/site";

export type SeoFaq = {
  question: string;
  answer: string;
};

export type SeoPage = {
  path: string;
  /** SERP title (~50–60 chars). */
  title: string;
  description: string;
  /** On-page H1. */
  heading: string;
  /** Crawlable intro paragraph. */
  intro: string;
  faqs: readonly SeoFaq[];
  /** Optional OG / Twitter siteName override. */
  siteName?: string;
};

const SHARED_FAQS: readonly SeoFaq[] = [
  {
    question: "Is PIN5 free to play?",
    answer:
      "Yes. PIN5 is a free daily location game — no account required.",
  },
  {
    question: "How often is there a new puzzle?",
    answer:
      "A new puzzle drops every day. Come back tomorrow for the next set of five clues.",
  },
  {
    question: "How do you play?",
    answer:
      "Read each clue, place a pin on the map, and get closer with every guess. Five clues, five pins, one place.",
  },
];

export const HUB_SEO: SeoPage = {
  path: "/",
  title: "PIN5 — Daily location games | Geography & football",
  description:
    "Free daily location games: world geography, UK places, London pubs, tube stations, airports, Taylor Swift, Harry Potter, and football stadiums. Five clues. Five pins. One place.",
  heading: "Daily location games",
  intro:
    "PIN5 is a free daily puzzle hub. Each game gives you five clues and five map pins to find one place — from world landmarks and London pubs to tube stations, airports, Taylor Swift career places, Harry Potter filming locations, and football grounds.",
  faqs: [
    ...SHARED_FAQS,
    {
      question: "What games are on PIN5?",
      answer:
        "Play Daily 5 World, Airports, United Kingdom, London Pubs, London Train & Tube, Taylor Swift, Harry Potter, and Football 5 for England, Italy, Germany, France, and Spain.",
    },
  ],
};

export const MODE_SEO: Record<GameMode, SeoPage> = {
  world: {
    path: GAME_MODE_DEFINITIONS.world.path,
    title: "Daily World Geography Game — PIN5",
    description:
      "Free daily world geography quiz. Five clues, five pins — find today's place anywhere on Earth. New puzzle every day.",
    heading: "Daily world geography game",
    intro:
      "PIN5 World is a free daily geography puzzle. Use five clues and five map pins to find today's place anywhere on Earth. Share your score and come back tomorrow for a new challenge.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 World",
  },
  "world-airports": {
    path: GAME_MODE_DEFINITIONS["world-airports"].path,
    title: "Daily Airport Guessing Game — PIN5",
    description:
      "Free daily airport guessing game. Five clues, five pins — find today's major airport anywhere in the world.",
    heading: "Daily airport guessing game",
    intro:
      "PIN5 Airports is a free daily puzzle about major airports worldwide. Read five clues, place five pins on the map, and lock in today's airport. A new puzzle every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Airports",
  },
  daily: {
    path: GAME_MODE_DEFINITIONS.daily.path,
    title: "Daily UK Geography Game — PIN5",
    description:
      "Free daily UK geography quiz. Five clues, five pins — find today's place somewhere in the United Kingdom.",
    heading: "Daily UK geography game",
    intro:
      "PIN5 Daily 5 UK is a free daily geography puzzle set in the United Kingdom. Use five clues and five map pins to find today's place. New puzzle every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Daily 5",
  },
  "london-pubs": {
    path: GAME_MODE_DEFINITIONS["london-pubs"].path,
    title: "London Pubs Daily Quiz — PIN5",
    description:
      "Free daily London pubs quiz. Five clues, five pins — find today's famous London pub on the map.",
    heading: "London pubs daily quiz",
    intro:
      "PIN5 London Pubs is a free daily puzzle about famous London pubs. Follow five clues, place five pins, and find today's boozer. A new pub every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 London Pubs",
  },
  "london-stations": {
    path: GAME_MODE_DEFINITIONS["london-stations"].path,
    title: "London Tube & Train Daily Puzzle — PIN5",
    description:
      "Free daily London tube and train quiz. Five clues, five pins — find today's station on the TfL map.",
    heading: "London tube & train daily puzzle",
    intro:
      "PIN5 Train & Tube is a free daily London transport puzzle. Use five clues and five map pins to find today's tube or train station. New station every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Train & Tube",
  },
  "taylor-swift": {
    path: GAME_MODE_DEFINITIONS["taylor-swift"].path,
    title: "Taylor Swift Daily Geography Quiz — PIN5",
    description:
      "Free daily Taylor Swift location quiz. Five clues, five pins — find today's place from her music career anywhere on Earth.",
    heading: "Taylor Swift daily geography quiz",
    intro:
      "PIN5 Taylor Swift is a free daily entertainment-geography puzzle. Use five clues and five map pins to find today's place from her public music career — venues, video sets, landmarks and more. New place every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Taylor Swift",
  },
  "harry-potter": {
    path: GAME_MODE_DEFINITIONS["harry-potter"].path,
    title: "Harry Potter Filming Locations Quiz — PIN5",
    description:
      "Free daily Harry Potter geography quiz. Five clues, five pins — find today's real-world Wizarding World filming location or franchise place.",
    heading: "Harry Potter filming locations quiz",
    intro:
      "PIN5 Harry Potter is a free daily entertainment-geography puzzle. Use five clues and five map pins to find today's real-world place from the Wizarding World — filming locations, studios, theme parks and franchise landmarks. New place every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Harry Potter",
  },
  marvel: {
    path: GAME_MODE_DEFINITIONS.marvel.path,
    title: "Marvel Filming Locations Quiz — PIN5",
    description:
      "Free daily Marvel geography quiz. Five clues, five pins — find today's real-world MCU filming location or franchise place.",
    heading: "Marvel filming locations quiz",
    intro:
      "PIN5 Marvel is a free daily entertainment-geography puzzle. Use five clues and five map pins to find today's real-world place from Marvel — filming locations, studios, theme parks, actor birthplaces and franchise landmarks. New place every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Marvel",
  },
  "star-wars": {
    path: GAME_MODE_DEFINITIONS["star-wars"].path,
    title: "Star Wars Filming Locations Quiz — PIN5",
    description:
      "Free daily Star Wars geography quiz. Five clues, five pins — find today's real-world filming location or franchise place.",
    heading: "Star Wars filming locations quiz",
    intro:
      "PIN5 Star Wars is a free daily entertainment-geography puzzle. Use five clues and five map pins to find today's real-world place from Star Wars — filming locations, studios, theme parks, actor birthplaces and franchise landmarks. New place every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Star Wars",
  },
  football: {
    path: GAME_MODE_DEFINITIONS.football.path,
    title: "Daily Football Stadium Quiz — England — PIN5",
    description:
      "Free daily football stadium quiz for England's Football League clubs. Five clues, five pins — find today's home ground.",
    heading: "Daily football stadium quiz — England",
    intro:
      "PIN5 Football England is a free daily stadium puzzle covering the Football League clubs (the 92). Five clues and five pins to find today's home ground. New stadium every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Football England",
  },
  "football-italy": {
    path: GAME_MODE_DEFINITIONS["football-italy"].path,
    title: "Daily Football Stadium Quiz — Italy — PIN5",
    description:
      "Free daily Serie A and Serie B stadium quiz. Five clues, five pins — find today's Italian football ground.",
    heading: "Daily football stadium quiz — Italy",
    intro:
      "PIN5 Football Italy is a free daily stadium puzzle for Serie A and Serie B. Five clues and five pins to find today's home ground. New stadium every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Football Italy",
  },
  "football-germany": {
    path: GAME_MODE_DEFINITIONS["football-germany"].path,
    title: "Daily Football Stadium Quiz — Germany — PIN5",
    description:
      "Free daily Bundesliga stadium quiz. Five clues, five pins — find today's German football ground.",
    heading: "Daily football stadium quiz — Germany",
    intro:
      "PIN5 Football Germany is a free daily stadium puzzle for Bundesliga and 2. Bundesliga. Five clues and five pins to find today's home ground. New stadium every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Football Germany",
  },
  "football-france": {
    path: GAME_MODE_DEFINITIONS["football-france"].path,
    title: "Daily Football Stadium Quiz — France — PIN5",
    description:
      "Free daily Ligue 1 and Ligue 2 stadium quiz. Five clues, five pins — find today's French football ground.",
    heading: "Daily football stadium quiz — France",
    intro:
      "PIN5 Football France is a free daily stadium puzzle for Ligue 1 and Ligue 2. Five clues and five pins to find today's home ground. New stadium every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Football France",
  },
  "football-spain": {
    path: GAME_MODE_DEFINITIONS["football-spain"].path,
    title: "Daily Football Stadium Quiz — Spain — PIN5",
    description:
      "Free daily LaLiga and Segunda stadium quiz. Five clues, five pins — find today's Spanish football ground.",
    heading: "Daily football stadium quiz — Spain",
    intro:
      "PIN5 Football Spain is a free daily stadium puzzle for LaLiga and Segunda División. Five clues and five pins to find today's home ground. New stadium every day.",
    faqs: SHARED_FAQS,
    siteName: "PIN5 Football Spain",
  },
};

/** All indexable public paths (hub + games). */
export const INDEXABLE_PATHS: readonly string[] = [
  HUB_SEO.path,
  ...GAME_MODES.map((mode) => MODE_SEO[mode].path),
];

export function seoForMode(mode: GameMode): SeoPage {
  return MODE_SEO[mode];
}

export function absoluteUrl(path: string): string {
  if (path === "/") {
    return SITE_URL;
  }
  return `${SITE_URL}${path}`;
}

export function buildPageMetadata(page: SeoPage): Metadata {
  const url = absoluteUrl(page.path);
  const siteName = page.siteName ?? "PIN5";

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: page.path,
    },
    openGraph: {
      type: "website",
      url,
      title: page.title,
      description: page.description,
      siteName,
      locale: "en_GB",
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
  };
}

export function relatedGameLinks(
  currentMode?: GameMode,
): Array<{ href: string; label: string }> {
  return GAME_MODES.filter((mode) => mode !== currentMode).map((mode) => {
    const def = GAME_MODE_DEFINITIONS[mode];
    return {
      href: def.path,
      label: `${def.title} · ${def.subtitle}`,
    };
  });
}

export function faqJsonLd(page: SeoPage): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function websiteJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PIN5",
    url: SITE_URL,
    description: HUB_SEO.description,
    inLanguage: "en-GB",
  };
}
