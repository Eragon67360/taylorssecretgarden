import { notFound } from "next/navigation";

import { EraScope } from "@/components/era-scope";
import { CATALOGUE, albumName } from "@/lib/catalogue";
import { ERAS, ERA_LOOKS, type EraSlug, paperTexture } from "@/lib/eras";
import { pageMetadata } from "@/lib/metadata";

import { EraSandbox } from "./era-sandbox";
import { EraTitle } from "./era-title";
import { KitSpread } from "./kit-spread";

export const metadata = pageMetadata({
  title: "Styleguide",
  description: "The scrapbook kit and every Era's look, for development.",
  path: "/styleguide",
  noindex: true,
});

/** Eras shown side by side: the plain journal, dark paper, plaid, and a gold one. */
const SPREADS: (EraSlug | undefined)[] = [undefined, "reputation", "evermore", "fearless"];

/**
 * The scrapbook kit in several Eras, for development. Production serves it
 * only when ENABLE_STYLEGUIDE=1 (set for the Playwright suite and CI), so the
 * live site answers 404.
 */
export default function Styleguide() {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_STYLEGUIDE !== "1") notFound();

  return (
    <div className="overflow-x-clip">
      <div className="mx-auto max-w-[1240px] px-4 pt-12 pb-10 sm:px-8">
        <p className="text-soft text-[11px] font-bold tracking-[.26em] uppercase">Development only · not in production</p>
        <h1 className="font-serif mt-2 text-[clamp(2.6rem,7vw,4.8rem)] leading-none font-semibold tracking-[-0.02em]">Styleguide</h1>
        <p className="text-soft mt-4 max-w-[40rem] text-[17px] leading-relaxed">
          The scrapbook kit (components/scrapbook) and every Era&apos;s look (lib/eras.ts). An Era applies by overriding the journal&apos;s
          colour variables and display face on a container (components/era-scope.tsx).
        </p>
      </div>

      <section aria-labelledby="palettes" className="mx-auto max-w-[1240px] px-4 pb-14 sm:px-8">
        <h2 className="font-serif text-[32px] font-semibold" id="palettes">
          Era palettes
        </h2>
        <p className="text-soft mt-1 text-[15px]">Ink and soft ink on paper and on card: WCAG AA in every Era (checked by axe).</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ERAS.map((look) => (
            <li key={look.slug}>
              <EraScope as="article" className="border-line h-full border p-4" era={look.slug}>
                <h3 className="text-[18px] font-bold">{look.name}</h3>
                <p className="text-soft text-[13px]">
                  {look.year} · {look.flower} · {paperTexture(look)} paper
                </p>
                <div aria-hidden="true" className="mt-3 flex gap-1.5">
                  {[look.paper, look.card, look.accent, look.line, look.tape].map((colour, index) => (
                    <span key={index} className="border-line size-6 rounded-full border" style={{ background: colour }} />
                  ))}
                </div>
                <p className="mt-3 text-[15px]">Ink on paper</p>
                <p className="text-soft text-[15px]">Soft ink on paper</p>
                <div className="bg-card mt-2 p-2.5">
                  <p className="text-[15px]">Ink on card</p>
                  <p className="text-soft text-[15px]">Soft ink on card</p>
                  <p className="bg-accent text-on-accent mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[13px] font-bold">On accent</p>
                </div>
              </EraScope>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="album-eras" className="mx-auto max-w-[1240px] px-4 pb-14 sm:px-8">
        <h2 className="font-serif text-[32px] font-semibold" id="album-eras">
          Album → Era
        </h2>
        <p className="text-soft mt-1 text-[15px]">
          The catalogue (lib/catalogue.ts): each Album in its most complete edition on Deezer. A Taylor&apos;s Version shares its
          original&apos;s Era.
        </p>
        <table className="mt-4 w-full max-w-[720px] text-left text-[15px]">
          <thead className="text-soft text-[11px] tracking-[.2em] uppercase">
            <tr className="border-line border-b">
              <th className="py-2 pr-3 font-bold">Deezer Album ID</th>
              <th className="py-2 pr-3 font-bold">Album</th>
              <th className="py-2 font-bold">Era</th>
            </tr>
          </thead>
          <tbody>
            {CATALOGUE.map((album) => (
              <tr key={album.id} className="border-line border-b">
                <td className="py-1.5 pr-3 font-mono text-[14px]">{album.id}</td>
                <td className="py-1.5 pr-3">
                  {albumName(album)}
                  {album.edition && <span className="text-soft"> · {album.edition}</span>}
                </td>
                <td className="py-1.5">{ERA_LOOKS[album.era].name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <EraSandbox />

      {SPREADS.map((era) => (
        <EraScope key={era ?? "journal"} as="section" className="overflow-x-clip px-4 py-14 sm:px-8" era={era}>
          <div className="mx-auto max-w-[1176px]">
            <EraTitle look={era && ERA_LOOKS[era]} />
            <div className="mt-8">
              <KitSpread era={era} />
            </div>
          </div>
        </EraScope>
      ))}
    </div>
  );
}
