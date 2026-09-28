import type { ComponentPropsWithoutRef } from "react";

import { EraScope } from "@/components/era-scope";
import { PAPER_TEXTURE } from "@/components/scrapbook/paper";
import { eraVariables, paperTexture } from "@/lib/eras";
import { ERAS_TOUR_LOOK, type Tour } from "@/lib/tours";
import { cn } from "@/lib/utils";

type TourScopeProps = ComponentPropsWithoutRef<"section"> & { tour: Pick<Tour, "era"> };

/** A section in a Tour's look: its Era's (<EraScope>), or the Eras Tour's own. */
export function TourScope({ tour, className, style, ...props }: TourScopeProps) {
  if (tour.era) return <EraScope as="section" className={className} era={tour.era} style={style} {...props} />;

  return (
    <section
      className={cn("era", PAPER_TEXTURE[paperTexture(ERAS_TOUR_LOOK)], className)}
      data-era="eras-tour"
      style={{ ...eraVariables(ERAS_TOUR_LOOK), ...style }}
      {...props}
    />
  );
}
