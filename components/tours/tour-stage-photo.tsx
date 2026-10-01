import Image from "next/image";

import { Polaroid } from "@/components/scrapbook";
import { type GalleryPhoto } from "@/lib/tours";
import { cn } from "@/lib/utils";

type TourStagePhotoProps = {
  photo: GalleryPhoto;
  /** Rendered width on a wide screen, for the image's `sizes`. */
  width: number;
  tilt?: number;
  className?: string;
};

/** A wide photo from a Tour's stage, taped in beside its facts. */
export function TourStagePhoto({ photo, width, tilt = 3, className }: TourStagePhotoProps) {
  return (
    <div className={cn("relative", className)}>
      <Polaroid taped caption={photo.caption} credit={photo.credit} tilt={tilt}>
        <Image
          alt={photo.alt}
          className="h-auto w-full"
          height={photo.size[1]}
          sizes={`(max-width: 640px) 90vw, ${width}px`}
          src={photo.src}
          width={photo.size[0]}
        />
      </Polaroid>
    </div>
  );
}
