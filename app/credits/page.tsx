import Link from "next/link";

import { siteConfig } from "@/config/site";
import { DeezerLogo } from "@/components/deezer-logo";
import { Scribble } from "@/components/scrapbook";
import { type Credit, HOME_PHOTO } from "@/lib/credits";
import { pageMetadata } from "@/lib/metadata";
import { TOURS, type Tour } from "@/lib/tours";

export const metadata = pageMetadata({
  title: "Credits",
  description:
    "Who took the scrapbook's photos and under which Creative Commons licence, where the Eras Tour trailer comes from, and where the music data and previews come from.",
  path: "/credits",
  noindex: true,
});

const link = "text-ink focus-ring rounded-sm font-semibold underline decoration-1 underline-offset-2 hover:decoration-2";

type CreditedItem = { label: string; credit: Credit };

/** A Tour's credited pictures and its trailer, in the order its page shows them. */
function tourCredits(tour: Tour): CreditedItem[] {
  return [
    { label: "Poster", credit: tour.imageCredit },
    tour.trailer && { label: "Trailer", credit: tour.trailer.credit },
    tour.trailer?.still.credit && { label: "Trailer: the photo before it plays", credit: tour.trailer.still.credit },
    tour.stage?.credit && { label: `Stage photo: “${tour.stage.caption}”`, credit: tour.stage.credit },
    ...(tour.gallery ?? []).map((photo) => photo.credit && { label: `Gallery: “${photo.caption}”`, credit: photo.credit }),
  ].filter((item): item is CreditedItem => Boolean(item));
}

/** One credited picture or video: what it is, whose, on what terms (the licence linked), from where, and what was changed. */
function CreditEntry({ label, credit }: CreditedItem) {
  return (
    <li className="py-3 text-[15px] leading-relaxed">
      <span className="text-soft text-[11px] font-bold tracking-[.2em] uppercase">{label}</span>
      <p>{credit.work}</p>
      <p className="text-soft">
        ©{" "}
        {credit.url ? (
          <a className={link} href={credit.url} rel="noreferrer" target="_blank">
            {credit.author}
          </a>
        ) : (
          <span className="text-ink font-semibold">{credit.author}</span>
        )}
        .{" "}
        {credit.licenceUrl ? (
          <a className={link} href={credit.licenceUrl} rel="license noreferrer" target="_blank">
            {credit.licence}
          </a>
        ) : (
          credit.licence
        )}
        .{credit.changes && ` ${credit.changes}.`}
      </p>
    </li>
  );
}

/**
 * The journal's back pages: who took every photo and under which licence
 * (lib/credits.ts), on Home and by Tour, where the trailer comes from, and
 * where the music comes from. None of them is the garden's own.
 */
export default function CreditsPage() {
  const tours = TOURS.map((tour) => ({ tour, items: tourCredits(tour) }));

  return (
    <div className="mx-auto max-w-[900px] px-4 pt-12 pb-20 sm:px-8 sm:pt-16">
      <p className="font-hand text-accent mb-2 -rotate-2 text-2xl font-bold">the back pages · who took what</p>
      <h1 className="relative inline-block font-serif text-[clamp(3rem,9vw,5.5rem)] leading-[0.9] font-semibold tracking-[-0.02em]">
        Credits
        <Scribble className="absolute -bottom-3 left-0 h-4 w-full" />
      </h1>
      <p className="text-soft mt-8 max-w-[38rem] text-[17px] leading-relaxed">
        The photos in this scrapbook are not ours: fans and photographers took them and shared them on Wikimedia Commons under Creative Commons licences, which
        let us show them, cropped, as long as they are credited as below. The Eras Tour trailer is Taylor Swift&apos;s own, embedded from her official YouTube
        channel. If one of them is yours and you would like it credited differently or taken out, write to{" "}
        <a className={link} href={`mailto:${siteConfig.contactEmail}`}>
          {siteConfig.contactEmail}
        </a>{" "}
        and it will be corrected or removed promptly (see the{" "}
        <Link className={link} href="/legal">
          legal notice
        </Link>
        ).
      </p>

      <section aria-labelledby="credits-home" className="mt-14">
        <h2 className="font-serif text-[clamp(2rem,4vw,2.6rem)] leading-tight font-semibold" id="credits-home">
          Home
        </h2>
        <ul className="border-line mt-3 divide-y border-y">
          <CreditEntry credit={HOME_PHOTO.credit} label="The taped photo, also on the link preview" />
        </ul>
      </section>

      <section aria-labelledby="credits-tours" className="mt-14">
        <h2 className="font-serif text-[clamp(2rem,4vw,2.6rem)] leading-tight font-semibold" id="credits-tours">
          Tours
        </h2>
        {tours.map(({ tour, items }) => (
          <section key={tour.slug} aria-labelledby={`credits-${tour.slug}`} className="mt-8">
            <h3 className="font-serif text-2xl font-semibold" id={`credits-${tour.slug}`}>
              {tour.tour}
            </h3>
            <ul className="border-line mt-3 divide-y border-y">
              {items.map((item) => (
                <CreditEntry key={item.label} {...item} />
              ))}
            </ul>
          </section>
        ))}
      </section>

      <section aria-labelledby="credits-music" className="mt-14">
        <h2 className="font-serif text-[clamp(2rem,4vw,2.6rem)] leading-tight font-semibold" id="credits-music">
          Music
        </h2>
        <p className="text-soft mt-3 max-w-[38rem] text-[17px] leading-relaxed">
          Album data, covers and 30-second previews come from{" "}
          <a className={link} href="https://www.deezer.com/">
            <DeezerLogo />
          </a>{" "}
          through its API, for private listening only. The covers and recordings belong to their labels.
        </p>
      </section>
    </div>
  );
}
