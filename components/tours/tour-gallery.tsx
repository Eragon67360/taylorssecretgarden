import Image from "next/image";

import { Polaroid } from "@/components/scrapbook";
import { type GalleryPhoto } from "@/lib/tours";

const TILTS = [-3, 2, -1.5, 3];

/** A Tour's photos, taped into the diary as polaroids. */
export function TourGallery({ photos }: { photos: GalleryPhoto[] }) {
  return (
    // At the foot of the page: rendered (and its photos fetched) only when scrolled near (globals.css).
    <section aria-labelledby="gallery" className="below-fold mt-24 [--fold-height:1760px] sm:[--fold-height:1100px] lg:[--fold-height:510px]">
      <h2 className="font-serif text-[clamp(2rem,4vw,2.6rem)] leading-tight font-semibold" id="gallery">
        Gallery
      </h2>
      <p className="font-hand text-soft mt-1 text-2xl font-bold">photos from the floor, the stands and the nosebleeds</p>
      <ul className="mt-12 grid grid-cols-1 items-start gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.src} className="mx-auto w-[86%] sm:w-full">
            <Polaroid caption={photo.caption} credit={photo.credit} taped={index % 2 === 0} tilt={TILTS[index % TILTS.length]}>
              <Image
                alt={photo.alt}
                className="h-auto w-full"
                height={photo.size[1]}
                sizes="(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 260px"
                src={photo.src}
                width={photo.size[0]}
              />
            </Polaroid>
          </li>
        ))}
      </ul>
    </section>
  );
}
