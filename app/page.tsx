import { siteConfig } from "@/config/site";
import { getEraAlbums } from "@/components/home/era-albums";
import { EraGallery } from "@/components/home/era-gallery";
import { Hero } from "@/components/home/hero";
import { TourWall } from "@/components/home/tour-wall";
import { WaysIn } from "@/components/home/ways-in";
import { JsonLd, TAYLOR_SWIFT } from "@/components/json-ld";
import { absoluteUrl, pageMetadata } from "@/lib/metadata";

// The site's own title and description (app/layout.tsx).
export const metadata = pageMetadata({ path: "/" });

/** The Eras whose covers spill out of the Music envelope. */
const ENVELOPE_ERAS = ["folklore", "red", "reputation", "lover"] as const;

/** Home: the journal's opening spread (#20). */
export default async function Home() {
  const albums = await getEraAlbums();

  return (
    <div className="relative w-full overflow-x-clip pb-4">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          url: absoluteUrl("/"),
          description: siteConfig.description,
          inLanguage: "en",
          about: TAYLOR_SWIFT,
        }}
      />
      <Hero />
      <WaysIn covers={ENVELOPE_ERAS.map((era) => albums[era])} />
      <EraGallery albums={albums} />
      <TourWall />
    </div>
  );
}
