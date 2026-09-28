import Link from "next/link";

import { PressedFlower, StickyNote } from "@/components/scrapbook";
import { type Tour, tourLook, tourYears } from "@/lib/tours";
import { cn } from "@/lib/utils";

import { TourPoster } from "./tour-poster";
import { TourScope } from "./tour-scope";
import { TourNote, TourStub } from "./tour-stub";
import { TourVideo } from "./tour-video";

type TourEntryProps = {
  tour: Tour;
  /** Position in the journal, from 0: sets the page number and which side the pictures sit. */
  index: number;
};

/**
 * One Tour's page in the Tours journal, in the Tour's look: its ticket stub,
 * the poster and (when there is footage) the video in taped polaroids, and a
 * link to the Tour page.
 */
export function TourEntry({ tour, index }: TourEntryProps) {
  const look = tourLook(tour);
  const flip = index % 2 === 1;
  const headingId = `tour-${tour.slug}`;

  return (
    <TourScope
      aria-labelledby={headingId}
      // Off-screen Tours skip rendering until scrolled near, so their Era's
      // display face and poster load then, not with the page.
      className="relative overflow-x-clip shadow-[inset_0_14px_18px_-14px_rgba(0,0,0,.28)] [contain-intrinsic-size:auto_1200px] [content-visibility:auto]"
      id={tour.slug}
      tour={tour}
    >
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-4 py-16 sm:px-8 sm:py-20 lg:grid-cols-12 lg:gap-10">
        <div className={cn("relative lg:col-span-5", flip && "lg:order-2 lg:col-start-8")}>
          <p className="font-hand text-soft mb-5 text-2xl font-bold">
            page {index + 1} · {tourYears(tour)}
          </p>
          <TourStub
            as="h2"
            className="max-w-[440px]"
            tilt={flip ? 2 : -2}
            titleClassName="text-[34px] leading-[1.05] sm:text-[40px]"
            titleId={headingId}
            tour={tour}
          />
          <TourNote className="mt-8 max-w-[26rem] text-[26px]" tour={tour} />
          <p className="text-soft mt-3 max-w-[30rem] text-[17px] leading-relaxed">{tour.facts[0]}</p>
          <Link
            className="focus-ring font-hand text-ink decoration-accent mt-6 inline-block text-2xl font-bold underline decoration-2 underline-offset-4"
            href={`/tours/${tour.slug}`}
          >
            More on {tour.tour} <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className={cn("relative lg:col-span-7", flip && "lg:order-1")}>
          <div className="relative mx-auto flex max-w-[620px] flex-col items-center gap-10 sm:flex-row sm:items-start sm:gap-0">
            <TourPoster
              className="w-[68%] shrink-0 sm:w-[44%]"
              tilt={flip ? 3 : -3}
              tour={tour}
              width={272}
            />
            {tour.videoUrl ? (
              <TourVideo
                caption="on repeat"
                className="w-[92%] sm:mt-24 sm:-ml-8 sm:w-[62%]"
                src={tour.videoUrl}
                tilt={flip ? -2 : 2.5}
                tour={tour.tour}
              />
            ) : (
              <div className="relative flex w-full justify-center sm:mt-16 sm:w-[56%]">
                <PressedFlower className="absolute -top-6 left-[8%] h-40 w-24 -rotate-12 sm:left-0" kind={look.flower} />
                <StickyNote attach="pin" className="relative w-[230px]" tilt={flip ? -3 : 4} tone="era">
                  no footage in the scrapbook yet. the poster will have to do
                </StickyNote>
              </div>
            )}
          </div>
        </div>
      </div>
    </TourScope>
  );
}
