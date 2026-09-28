import { Polaroid } from "@/components/scrapbook";
import Image from "next/image";
import { type GalleryPhoto } from "@/lib/tours";

const TILTS = [-3, 2, -1.5, 3];

/** A Tour's photos, taped into the diary as polaroids. */
export function TourGallery({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <section aria-labelledby="gallery" className="mt-24">
      <h2 className="font-serif text-[clamp(2rem,4vw,2.6rem)] leading-tight font-semibold" id="gallery">
        Gallery
      </h2>
      <p className="font-hand text-soft mt-1 text-2xl font-bold">photos from the floor, the stands and the nosebleeds</p>
      <ul className="mt-12 grid grid-cols-1 items-start gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
        {photos.map((photo, index) => (
          <li key={photo.src} className="mx-auto w-[86%] sm:w-full">
            <Polaroid caption={photo.caption} taped={index % 2 === 0} tilt={TILTS[index % TILTS.length]}>
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
