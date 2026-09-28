import type { Metadata } from "next";

import { Scribble, StickyNote } from "@/components/scrapbook";
import { TourEntry } from "@/components/tours/tour-entry";
import { TOURS, tourYears } from "@/lib/tours";

export const metadata: Metadata = {
  title: "Tours",
  description: "Every Taylor Swift Tour, from Fearless to the Eras Tour, kept in a fan's scrapbook: tickets, posters and footage.",
};

export default function ToursPage() {
  return (
    <>
      <header className="relative overflow-x-clip">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 pt-12 pb-16 sm:px-8 sm:pt-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="font-hand text-accent mb-2 -rotate-2 text-2xl font-bold">page 3 · the tour diary</p>
            <h1 className="relative inline-block font-serif text-[clamp(3.6rem,11vw,7rem)] leading-[0.9] font-semibold tracking-[-0.02em]">
              Tours
              <Scribble className="absolute -bottom-3 left-0 h-4 w-full" />
            </h1>
            <p className="text-soft mt-8 max-w-[34rem] text-[17px] leading-relaxed sm:text-lg">
              Six Tours, one diary: a ticket stub, a poster off the bedroom wall and a bit of footage for each, from the first headline
              shows of 2009 to three and a half hours of the Eras Tour.
            </p>
          </div>

          <nav aria-label="Tours in this diary" className="relative lg:col-span-5">
            <StickyNote attach="pin" className="mx-auto w-full max-w-[340px]" tilt={2.5}>
              <p className="mb-2 text-[26px]">jump to a Tour</p>
              <ol className="font-body space-y-1 text-base font-semibold">
                {TOURS.map((tour) => (
                  <li key={tour.slug}>
                    <a className="focus-ring underline decoration-1 underline-offset-4 hover:decoration-2" href={`#${tour.slug}`}>
                      {tour.tour}
                    </a>{" "}
                    <span className="font-normal">· {tourYears(tour)}</span>
                  </li>
                ))}
              </ol>
            </StickyNote>
          </nav>
        </div>
      </header>

      {TOURS.map((tour, index) => (
        <TourEntry key={tour.slug} index={index} tour={tour} />
      ))}
    </>
  );
}
