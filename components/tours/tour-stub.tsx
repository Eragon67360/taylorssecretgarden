import { TicketStub } from "@/components/scrapbook";
import { type Tour, tourEraLabel, tourYears } from "@/lib/tours";
import { cn } from "@/lib/utils";

type TourStubProps = {
  tour: Tour;
  /** The heading level the Tour's name takes. */
  as: "h1" | "h2";
  /** Id of the name, for the section's aria-labelledby. */
  titleId: string;
  /** Size of the name (utilities). */
  titleClassName: string;
  tilt?: number;
  className?: string;
};

/** A Tour's ticket stub: its Era, its name (a heading, in the Tour's display face), years, shows and continents. */
export function TourStub({ tour, as, titleId, titleClassName, tilt, className }: TourStubProps) {
  return (
    <TicketStub
      className={className}
      kicker={`Admit one · ${tourEraLabel(tour)}`}
      meta={`${tourYears(tour)} · ${tour.shows} shows · ${tour.legs.length} continents`}
      tilt={tilt}
      title={
        <span className={cn("font-display block not-italic", titleClassName)} id={titleId}>
          {tour.tour}
        </span>
      }
      titleAs={as}
    />
  );
}

/** The Tour's handwritten fan note, in quotes. */
export function TourNote({ tour, className }: { tour: Pick<Tour, "note">; className?: string }) {
  return (
    <p className={cn("font-hand leading-tight font-bold", className)}>
      <span aria-hidden="true">“</span>
      {tour.note}
      <span aria-hidden="true">”</span>
    </p>
  );
}
