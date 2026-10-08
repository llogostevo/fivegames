/**
 * Controllable SEO copy + metadata for hub and game routes.
 */

import type { Metadata } from "next";

import { formatReleaseTimeLabel } from "@/lib/game/dailyConfig";
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
  /**
   * Link-preview title. Falls back to `title` when omitted.
   * Search titles and social titles are separate on purpose.
   */
  socialTitle?: string;
  /** Link-preview description. Falls back to `description` when omitted. */
  socialDescription?: string;
  /** Optional OG / Twitter siteName override. */
  siteName?: string;
  /** Personal or thin pages that should not appear in search. */
  noIndex?: boolean;
};

const SHARED_FAQS: readonly SeoFaq[] = [
  {
    question: "Is PIN5 free to play?",
    answer:
      "Yes. PIN5 is a free daily location game — no account required.",
  },
  {
    question: "How often is there a new puzzle?",
    answer: `A new puzzle is available every day at ${formatReleaseTimeLabel()} UK time. Before then, the previous day's game is still the one to play.`,
  },
  {
    question: "How do you play?",
    answer:
      "Read each clue, place a pin on the map, and get closer with every guess. Five clues, five pins, one place.",
  },
];

export const HUB_SOCIAL = {
  title: "PIN5 — Five clues. One place. Can you find it?",
  description:
    "Five clues. Five pins. One mystery location. Play free daily map games covering geography, football, London and more. How close can you get?",
} as const;

export const HUB_SEO: SeoPage = {
  path: "/",
  title: "PIN5 — Free Daily Geography & Map Games",
  description:
    "Play free daily map games with five clues and five guesses. Explore world geography, London, football stadiums, famous places and more. New puzzles every day.",
  heading: "Free Daily Geography & Map Games",
  intro:
    "Love geography, maps or a good daily puzzle? PIN5 is a collection of free daily location guessing games. Follow five clues, drop your pins on the map and see how close you can get. From world cities and London pubs to football stadiums and famous filming locations, there's a new challenge every day.",
  socialTitle: HUB_SOCIAL.title,
  socialDescription: HUB_SOCIAL.description,
  faqs: [
    ...SHARED_FAQS,
    {
      question: "What games are on PIN5?",
      answer:
        "World places, world airports, UK places, London pubs, London tube and rail stations, UK railway stations, Taylor Swift places, Harry Potter, Marvel and Star Wars filming locations, plus football stadiums in England, Italy, Germany, France and Spain.",
    },
  ],
};

function withSharedFaqs(extra: readonly SeoFaq[]): readonly SeoFaq[] {
  return [...SHARED_FAQS, ...extra];
}

export const MODE_SEO: Record<GameMode, SeoPage> = {
  world: {
    path: GAME_MODE_DEFINITIONS.world.path,
    title: "Daily World Geography Game — PIN5",
    description:
      "Free daily world geography quiz. Five clues, five pins — find today's place anywhere on Earth. New puzzle every day.",
    heading: "Daily world geography game",
    intro:
      "PIN5 World is a free daily geography puzzle. Use five clues and five map pins to find today's place anywhere on Earth. Share your score and come back tomorrow for a new challenge.",
    faqs: withSharedFaqs([
      {
        question: "Where in the world can the answer be?",
        answer:
          "Anywhere on Earth. The opening map is a world view, and the place can be a city, landmark or region.",
      },
    ]),
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
    faqs: withSharedFaqs([
      {
        question: "What counts as finding the airport?",
        answer:
          "Pin the airport itself. Zoom in until you can see the terminal.",
      },
    ]),
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
    faqs: withSharedFaqs([
      {
        question: "Are the places only in the UK?",
        answer:
          "Yes. This edition is a place somewhere in the United Kingdom, not a world location.",
      },
    ]),
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
    faqs: withSharedFaqs([
      {
        question: "Are these real pubs?",
        answer:
          "Yes. Each day is a real London pub, and the pin needs to land on the venue.",
      },
    ]),
    siteName: "PIN5 London Pubs",
  },
  "london-stations": {
    path: GAME_MODE_DEFINITIONS["london-stations"].path,
    title: "London Tube & Rail Stations Game — PIN5",
    description:
      "Free daily London station game. Five clues, five pins — find today's tube, Overground, Elizabeth line, DLR or rail station.",
    heading: "London tube and rail stations game",
    intro:
      "PIN5 Train & Tube is a free daily London transport puzzle. Use five clues and five map pins to find today's tube or train station. New station every day.",
    faqs: withSharedFaqs([
      {
        question: "Is it only Underground stations?",
        answer:
          "No. Days can be Underground, Overground, Elizabeth line, DLR or National Rail stations in London.",
      },
    ]),
    siteName: "PIN5 Train & Tube",
  },
  "uk-stations": {
    path: GAME_MODE_DEFINITIONS["uk-stations"].path,
    title: "UK Railway Stations Daily Quiz — PIN5",
    description:
      "Free daily National Rail quiz. Five clues, five pins — find today's UK railway station on the map.",
    heading: "UK railway stations daily quiz",
    intro:
      "PIN5 UK Railway Stations is a free daily National Rail puzzle. Use five clues and five map pins to find today's railway station somewhere in Great Britain. A new station every morning.",
    faqs: withSharedFaqs([
      {
        question: "Does it include every station in Britain?",
        answer:
          "No. The pool is a set of notable National Rail stations in Great Britain, including the main London terminals.",
      },
    ]),
    siteName: "PIN5 UK Railway Stations",
  },
  "taylor-swift": {
    path: GAME_MODE_DEFINITIONS["taylor-swift"].path,
    title: "Taylor Swift Places Map Game — PIN5",
    description:
      "Free daily Taylor Swift map game. Five clues, five pins — find a real place from her public music career.",
    heading: "Taylor Swift places map game",
    intro:
      "PIN5 Taylor Swift is a free daily entertainment-geography puzzle. Use five clues and five map pins to find today's place from her public music career — venues, video sets, landmarks and more. New place every day.",
    faqs: withSharedFaqs([
      {
        question: "Are the answers real places?",
        answer:
          "Yes. Each answer is a real venue, video location or landmark from Taylor Swift's public career, not a fictional setting.",
      },
    ]),
    siteName: "PIN5 Taylor Swift",
  },
  "harry-potter": {
    path: GAME_MODE_DEFINITIONS["harry-potter"].path,
    title: "Harry Potter Filming Locations Game — PIN5",
    description:
      "Free daily Harry Potter map game. Five clues, five pins — find a real filming location, studio or franchise place.",
    heading: "Harry Potter filming locations game",
    intro:
      "PIN5 Harry Potter is a free daily entertainment-geography puzzle. Use five clues and five map pins to find today's real-world place from the Wizarding World — filming locations, studios, theme parks and franchise landmarks. New place every day.",
    faqs: withSharedFaqs([
      {
        question: "Is the pin a fictional place like Hogwarts?",
        answer:
          "No. The pin is a real-world filming location, studio, theme park or other franchise site.",
      },
    ]),
    siteName: "PIN5 Harry Potter",
  },
  marvel: {
    path: GAME_MODE_DEFINITIONS.marvel.path,
    title: "Marvel Filming Locations Game — PIN5",
    description:
      "Free daily Marvel map game. Five clues, five pins — find a real filming location, studio or franchise place.",
    heading: "Marvel filming locations game",
    intro:
      "PIN5 Marvel is a free daily entertainment-geography puzzle. Use five clues and five map pins to find today's real-world place from Marvel — filming locations, studios, theme parks, actor birthplaces and franchise landmarks. New place every day.",
    faqs: withSharedFaqs([
      {
        question: "Are these places from the comics or the real world?",
        answer:
          "The clues are about Marvel, but the pin is a real place: a filming location, studio, theme park or franchise site.",
      },
    ]),
    siteName: "PIN5 Marvel",
  },
  "star-wars": {
    path: GAME_MODE_DEFINITIONS["star-wars"].path,
    title: "Star Wars Filming Locations Game — PIN5",
    description:
      "Free daily Star Wars map game. Five clues, five pins — find a real filming location, studio or franchise place.",
    heading: "Star Wars filming locations game",
    intro:
      "PIN5 Star Wars is a free daily entertainment-geography puzzle. Use five clues and five map pins to find today's real-world place from Star Wars — filming locations, studios, theme parks, actor birthplaces and franchise landmarks. New place every day.",
    faqs: withSharedFaqs([
      {
        question: "Do I pin a planet from the films?",
        answer:
          "No. Each answer is a real-world filming location, studio, theme park or other franchise place.",
      },
    ]),
    siteName: "PIN5 Star Wars",
  },
  football: {
    path: GAME_MODE_DEFINITIONS.football.path,
    title: "England Football Stadiums Game — PIN5",
    description:
      "Free daily England football stadium game. Five clues, five pins — find today's home ground from the 92 Football League clubs.",
    heading: "England football stadiums game",
    intro:
      "PIN5 Football England is a free daily stadium puzzle covering the Football League clubs (the 92). Five clues and five pins to find today's home ground. New stadium every day.",
    faqs: withSharedFaqs([
      {
        question: "Which clubs are included?",
        answer:
          "Home grounds of the 92 English Football League clubs. The pin is the stadium, not the club's city in general.",
      },
    ]),
    siteName: "PIN5 Football England",
  },
  "football-italy": {
    path: GAME_MODE_DEFINITIONS["football-italy"].path,
    title: "Italy Football Stadiums Game — PIN5",
    description:
      "Free daily Italian football stadium game. Five clues, five pins — find today's Serie A or Serie B home ground.",
    heading: "Italy football stadiums game",
    intro:
      "PIN5 Football Italy is a free daily stadium puzzle for Serie A and Serie B. Five clues and five pins to find today's home ground. New stadium every day.",
    faqs: withSharedFaqs([
      {
        question: "Which leagues are included?",
        answer:
          "Serie A and Serie B. The pin is the club's home ground.",
      },
    ]),
    siteName: "PIN5 Football Italy",
  },
  "football-germany": {
    path: GAME_MODE_DEFINITIONS["football-germany"].path,
    title: "Germany Football Stadiums Game — PIN5",
    description:
      "Free daily German football stadium game. Five clues, five pins — find today's Bundesliga or 2. Bundesliga home ground.",
    heading: "Germany football stadiums game",
    intro:
      "PIN5 Football Germany is a free daily stadium puzzle for Bundesliga and 2. Bundesliga. Five clues and five pins to find today's home ground. New stadium every day.",
    faqs: withSharedFaqs([
      {
        question: "Which leagues are included?",
        answer:
          "Bundesliga and 2. Bundesliga. The pin is the club's home ground.",
      },
    ]),
    siteName: "PIN5 Football Germany",
  },
  "football-france": {
    path: GAME_MODE_DEFINITIONS["football-france"].path,
    title: "France Football Stadiums Game — PIN5",
    description:
      "Free daily French football stadium game. Five clues, five pins — find today's Ligue 1 or Ligue 2 home ground.",
    heading: "France football stadiums game",
    intro:
      "PIN5 Football France is a free daily stadium puzzle for Ligue 1 and Ligue 2. Five clues and five pins to find today's home ground. New stadium every day.",
    faqs: withSharedFaqs([
      {
        question: "Which leagues are included?",
        answer:
          "Ligue 1 and Ligue 2. The pin is the club's home ground.",
      },
    ]),
    siteName: "PIN5 Football France",
  },
  "football-spain": {
    path: GAME_MODE_DEFINITIONS["football-spain"].path,
    title: "Spain Football Stadiums Game — PIN5",
    description:
      "Free daily Spanish football stadium game. Five clues, five pins — find today's LaLiga or Segunda División home ground.",
    heading: "Spain football stadiums game",
    intro:
      "PIN5 Football Spain is a free daily stadium puzzle for LaLiga and Segunda División. Five clues and five pins to find today's home ground. New stadium every day.",
    faqs: withSharedFaqs([
      {
        question: "Which leagues are included?",
        answer:
          "LaLiga and Segunda División. The pin is the club's home ground.",
      },
    ]),
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

export function socialTitleFor(page: SeoPage): string {
  return page.socialTitle ?? page.title;
}

export function socialDescriptionFor(page: SeoPage): string {
  return page.socialDescription ?? page.description;
}

export function buildPageMetadata(page: SeoPage): Metadata {
  const url = absoluteUrl(page.path);
  const siteName = page.siteName ?? "PIN5";
  const shareTitle = socialTitleFor(page);
  const shareDescription = socialDescriptionFor(page);

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical: page.path,
    },
    ...(page.noIndex
      ? { robots: { index: false, follow: false } }
      : {}),
    openGraph: {
      type: "website",
      url,
      title: shareTitle,
      description: shareDescription,
      siteName,
      locale: "en_GB",
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: shareDescription,
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

/**
 * Lightweight Game node for a playable edition.
 * VideoGame is not used: the site has no platform, publisher, rating or offer data.
 */
export function gameJsonLd(page: SeoPage): object {
  return {
    "@context": "https://schema.org",
    "@type": "Game",
    name: page.siteName ?? page.heading,
    url: absoluteUrl(page.path),
    description: page.description,
    inLanguage: "en-GB",
    isAccessibleForFree: true,
  };
}
