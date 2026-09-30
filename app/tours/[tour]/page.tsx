import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { IntentLink } from "@/components/intent-link";
import { Bracelet, PressedFlower, RuledList, RuledListItem, StickyNote } from "@/components/scrapbook";
import { TourGallery } from "@/components/tours/tour-gallery";
import { TourPoster } from "@/components/tours/tour-poster";
import { TourScope } from "@/components/tours/tour-scope";
import { TourNote, TourStub } from "@/components/tours/tour-stub";
import { TourVideo } from "@/components/tours/tour-video";
import { ERA_LOOKS } from "@/lib/eras";
import { pageMetadata } from "@/lib/metadata";
import { TOURS, getTour, tourEraLabel, tourLook, tourYears } from "@/lib/tours";

type TourPageProps = { params: Promise<{ tour: string }> };

// Only the Tours in the data file have a page; any other slug is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return TOURS.map(({ slug }) => ({ tour: slug }));
}

export async function generateMetadata({ params }: TourPageProps): Promise<Metadata> {
  const tour = getTour((await params).tour);

  return tour
    ? pageMetadata({ title: tour.tour, description: `${tour.tour} (${tourYears(tour)}): ${tour.facts.join(" ")}`, path: `/tours/${tour.slug}` })
    : {};
}

export default async function TourPage({ params }: TourPageProps) {
  const tour = getTour((await params).tour);

  if (!tour) notFound();
  const look = tourLook(tour);
  const era = tour.era ? ERA_LOOKS[tour.era] : undefined;

  return (
    <TourScope aria-labelledby="tour-title" className="relative overflow-x-clip" tour={tour}>
      <div className="mx-auto max-w-[1180px] px-4 pt-8 pb-20 sm:px-8 sm:pt-10">
        <IntentLink className="focus-ring font-hand text-soft hover:text-ink inline-block text-2xl font-bold" href="/tours">
          <span aria-hidden="true">←</span> back to the Tours
        </IntentLink>

        {/* The stub, the poster and the numbers. */}
        <div className="mt-8 grid items-start gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <TourStub
              as="h1"
              className="max-w-[560px]"
              tilt={-1.5}
              titleClassName="text-[clamp(2.4rem,7vw,4rem)] leading-[1]"
              titleId="tour-title"
              tour={tour}
            />
            <TourNote className="mt-10 max-w-[30rem] text-[28px]" tour={tour} />

            <dl className="mt-10 grid max-w-[560px] grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
              <Stat label="Years">{tourYears(tour)}</Stat>
              <Stat label="Shows">{tour.shows} shows</Stat>
              <Stat label="Era">{tourEraLabel(tour)}</Stat>
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-soft text-[11px] font-bold tracking-[.26em] uppercase">Legs</dt>
                <dd className="mt-2">
                  <ul className="flex flex-wrap gap-2">
                    {tour.legs.map((leg) => (
                      <li key={leg} className="bg-card border-line rounded-full border px-3 py-1 text-[15px] font-semibold">
                        {leg}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>

          <div className="relative flex justify-center lg:col-span-5">
            <PressedFlower className="absolute -bottom-8 left-0 z-30 h-44 w-24 -rotate-[20deg] sm:left-6" kind={look.flower} />
            <TourPoster
              priority
              caption={tourYears(tour)}
              className="w-[78%] max-w-[380px]"
              tilt={2.5}
              tour={tour}
              width={380}
            />
          </div>
        </div>

        {/* The facts, on a notebook page, with the footage or the Era's note beside them. */}
        <div className="mt-20 grid items-start gap-14 lg:grid-cols-12 lg:gap-10">
          <section aria-labelledby="facts" className="lg:col-span-7">
            <h2 className="font-serif text-[clamp(2rem,4vw,2.6rem)] leading-tight font-semibold" id="facts">
              Worth remembering
            </h2>
            <RuledList className="mt-6" title="for the record">
              {tour.facts.map((fact) => (
                // Wrapped lines sit on the ruling: one 44px line each.
                <RuledListItem key={fact} className="items-start [&>span]:leading-[44px]">
                  <p className="text-[17px] leading-[44px]">{fact}</p>
                </RuledListItem>
              ))}
            </RuledList>
          </section>

          <div className="flex flex-col items-center gap-12 lg:col-span-5 lg:pt-16">
            {tour.videoUrl && <TourVideo caption="on repeat" className="w-full max-w-[440px]" src={tour.videoUrl} tilt={-2} tour={tour.tour} />}
            {era ? (
              <StickyNote attach="tape" className="w-[260px]" tilt={3} tone="era">
                {era.note}
              </StickyNote>
            ) : (
              <StickyNote attach="tape" className="w-[260px]" tilt={3}>
                every Era, one night, three and a half hours
              </StickyNote>
            )}
            <Bracelet beads={era ? "era" : "rainbow"} className="max-w-full" word={era ? era.short : "Eras Tour"} />
          </div>
        </div>

        {tour.gallery && <TourGallery photos={tour.gallery} />}
      </div>
    </TourScope>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-soft text-[11px] font-bold tracking-[.26em] uppercase">{label}</dt>
      <dd className="font-serif mt-1 text-2xl font-semibold">{children}</dd>
    </div>
  );
}
