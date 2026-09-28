import { Polaroid } from "@/components/scrapbook";
import { CloudinaryImage } from "@/components/cloudinary-image";
import { type Tour } from "@/lib/tours";

type TourPosterProps = {
  tour: Pick<Tour, "tour" | "imageUrl" | "posterSize">;
  caption?: string;
  tilt?: number;
  /** Rendered width on a wide screen, for the image's `sizes`. */
  width: number;
  priority?: boolean;
  className?: string;
};

/** A Tour's poster in a taped polaroid. */
export function TourPoster({ tour, caption, tilt = -3, width, priority = false, className }: TourPosterProps) {
  const [w, h] = tour.posterSize;

  return (
    <Polaroid taped caption={caption} className={className} tilt={tilt}>
      <CloudinaryImage
        alt={`${tour.tour} poster`}
        className="h-auto w-full"
        height={h}
        priority={priority}
        sizes={`(max-width: 640px) 80vw, ${width}px`}
        src={tour.imageUrl}
        width={w}
      />
    </Polaroid>
  );
}
