import type { ReactNode } from "react";

import { siteConfig } from "@/config/site";
import { Scribble, WashiTape } from "@/components/scrapbook";

type LegalPageProps = {
  /** The handwritten line above the title (e.g. "the small print"). */
  kicker: string;
  title: ReactNode;
  /** One or two sentences under the title: what the page is, in plain words. */
  intro: ReactNode;
  /** When the text last changed, as written on the page ("1 October 2026"). */
  updated: string;
  /** The page's sections, for a list of contents: each `id` is a Section's, `lang` its language if not the page's. */
  contents?: { id: string; title: string; lang?: string }[];
  children: ReactNode;
};

/*
  Long-form text (Section bodies) in the journal's ink: readable lines,
  paragraphs and lists spaced apart, and links underlined so they never rely
  on colour alone (axe's link-in-text-block).
*/
const PROSE =
  "text-[17px] leading-relaxed [&_a]:text-accent [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-ink [&_h3]:mt-6 [&_h3]:font-bold [&_h3]:text-ink [&_li]:mt-1.5 [&_li]:pl-1 [&_p]:mt-3 [&_strong]:text-ink [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6";

/**
 * The small print, written into the journal: the privacy policy, the legal
 * notice and the terms. A heading like the other pages', then the text on one
 * taped-in card at a readable width.
 */
export function LegalPage({ kicker, title, intro, updated, contents, children }: LegalPageProps) {
  return (
    <div className="mx-auto w-full max-w-[860px] overflow-x-clip px-4 pt-12 pb-20 sm:px-8 sm:pt-16">
      <header>
        <p className="font-hand text-accent mb-2 -rotate-2 text-2xl font-bold">{kicker}</p>
        <h1 className="relative inline-block font-serif text-[clamp(2.6rem,9vw,4.6rem)] leading-[0.95] font-semibold tracking-[-0.02em]">
          {title}
          <Scribble className="absolute -bottom-3 left-0 h-4 w-full" />
        </h1>
        <p className="text-soft mt-8 max-w-[38rem] text-[17px] leading-relaxed sm:text-lg">{intro}</p>
        <p className="text-soft mt-3 text-[14px]">Last updated {updated}.</p>
      </header>

      <div className="bg-card paper-grain relative mt-10 rounded-[3px] px-5 pt-10 pb-10 shadow-[0_10px_24px_rgba(60,40,20,.14)] sm:px-12">
        <WashiTape className="-top-3 left-8" rotate={-5} width={88} />
        <WashiTape className="-top-3 right-10" rotate={4} width={72} />

        {contents && (
          <nav aria-label="On this page" className="border-line mb-2 border-b border-dashed pb-6">
            <p className="font-hand text-[26px] leading-none font-bold">on this page</p>
            <ol className="mt-3 grid gap-x-8 gap-y-1 text-[16px] sm:grid-cols-2">
              {contents.map(({ id, title: name, lang }) => (
                <li key={id} lang={lang}>
                  <a className="focus-ring text-ink rounded-sm underline decoration-1 underline-offset-4 hover:decoration-2" href={`#${id}`}>
                    {name}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        {children}
      </div>
    </div>
  );
}

type SectionProps = {
  id: string;
  title: ReactNode;
  children: ReactNode;
  /** The section's language, when it is not the page's (the legal notice's French). */
  lang?: string;
};

/** One part of the small print: a heading, then its text. */
export function Section({ id, title, children, lang }: SectionProps) {
  return (
    <section aria-labelledby={`${id}-title`} className={`${PROSE} mt-8 scroll-mt-24 first:mt-0`} id={id} lang={lang}>
      <h2 className="font-serif text-ink text-[clamp(1.5rem,4vw,1.9rem)] leading-tight font-semibold" id={`${id}-title`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** The site's contact address, as a mail link. */
export function ContactEmail() {
  return <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>;
}
