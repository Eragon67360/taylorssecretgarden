import Image from "next/image";

import { Polaroid } from "@/components/scrapbook";
import { type Tour } from "@/lib/tours";

type TourPosterProps = {
  tour: Pick<Tour, "imageUrl" | "posterSize" | "imageAlt" | "imageCredit">;
  caption?: string;
  tilt?: number;
  /** Rendered width on a wide screen, for the image's `sizes`. */
  width: number;
  /** The page's lead picture: fetched first, and at the lower quality of above-the-fold pictures (next.config.ts). */
  priority?: boolean;
  className?: string;
};

/** A Tour's poster, a photo from its stage, in a taped polaroid. */
export function TourPoster({ tour, caption, tilt = -3, width, priority = false, className }: TourPosterProps) {
  const [w, h] = tour.posterSize;

  return (
    <Polaroid taped caption={caption} className={className} credit={tour.imageCredit} tilt={tilt}>
      <Image
        alt={tour.imageAlt}
        className="h-auto w-full"
        height={h}
        priority={priority}
        quality={priority ? 60 : undefined}
        sizes={`(max-width: 640px) 80vw, ${width}px`}
        src={tour.imageUrl}
        width={w}
      />
    </Polaroid>
  );
}
