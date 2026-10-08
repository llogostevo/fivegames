import Link from "next/link";

import {
  faqJsonLd,
  gameJsonLd,
  relatedGameLinks,
  type SeoPage,
  websiteJsonLd,
} from "@/lib/seo";
import type { GameMode } from "@/lib/game/modes";

type SeoCopyProps = {
  page: SeoPage;
  /** When set, omits that mode from related links. */
  mode?: GameMode;
  /** Include WebSite JSON-LD (hub only). */
  includeWebsiteSchema?: boolean;
  /** Hub already has an H1 — use 2 there. Game pages use 1. */
  headingLevel?: 1 | 2;
  /** Skip the heading when the page already renders it as the H1. */
  hideHeading?: boolean;
};

export function SeoCopy({
  page,
  mode,
  includeWebsiteSchema = false,
  headingLevel = 1,
  hideHeading = false,
}: SeoCopyProps) {
  const related = relatedGameLinks(mode);
  const HeadingTag = headingLevel === 1 ? "h1" : "h2";

  return (
    <section
      aria-label="About this game"
      className="border-t border-[#d8dbd4] bg-[#ebece7] px-4 py-10 sm:px-6 sm:py-12"
    >
      <div className="mx-auto w-full max-w-[720px]">
        {hideHeading ? null : (
          <HeadingTag className="font-display text-2xl font-bold tracking-tight text-[#1d1d1f] sm:text-[1.75rem]">
            {page.heading}
          </HeadingTag>
        )}
        <p
          className={`${hideHeading ? "" : "mt-3 "}text-[0.95rem] leading-relaxed text-[#3c4043] sm:text-base`}
        >
          {page.intro}
        </p>

        <h2 className="mt-8 font-display text-lg font-bold tracking-tight text-[#1d1d1f]">
          Frequently asked questions
        </h2>
        <dl className="mt-3 space-y-4">
          {page.faqs.map((faq) => (
            <div key={faq.question}>
              <dt className="text-sm font-semibold text-[#1d1d1f] sm:text-[0.95rem]">
                {faq.question}
              </dt>
              <dd className="mt-1 text-sm leading-relaxed text-[#5f6368] sm:text-[0.95rem]">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>

        {related.length > 0 ? (
          <>
            <h2 className="mt-8 font-display text-lg font-bold tracking-tight text-[#1d1d1f]">
              More PIN5 games
            </h2>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm sm:text-[0.95rem]">
              {mode ? (
                <li>
                  <Link
                    href="/"
                    className="font-medium text-[#c4157a] underline-offset-2 hover:underline"
                  >
                    All games
                  </Link>
                </li>
              ) : null}
              {related.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-medium text-[#c4157a] underline-offset-2 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>

      {page.faqs.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqJsonLd(page)),
          }}
        />
      ) : null}
      {mode ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(gameJsonLd(page)),
          }}
        />
      ) : null}
      {includeWebsiteSchema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd()),
          }}
        />
      ) : null}
    </section>
  );
}
