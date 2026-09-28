import { getEraAlbums } from "@/components/home/era-albums";
import { EraGallery } from "@/components/home/era-gallery";
import { Hero } from "@/components/home/hero";
import { TourWall } from "@/components/home/tour-wall";
import { WaysIn } from "@/components/home/ways-in";

/** The Eras whose covers spill out of the Music envelope. */
const ENVELOPE_ERAS = ["folklore", "red", "reputation", "lover"] as const;

/** Home: the journal's opening spread (#20). */
export default async function Home() {
  const albums = await getEraAlbums();

  return (
    <div className="relative w-full overflow-x-clip pb-4">
      <Hero />
      <WaysIn covers={ENVELOPE_ERAS.map((era) => albums[era])} />
      <EraGallery albums={albums} />
      <TourWall />
    </div>
  );
}
