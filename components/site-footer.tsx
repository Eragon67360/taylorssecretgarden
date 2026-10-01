import Link from "next/link";

import { DeezerLogo } from "@/components/deezer-logo";
import { Bracelet, Highlight, PressedFlower } from "@/components/scrapbook";

/** The legal pages, on every page: the privacy policy, the terms, whose pictures these are, and the legal notice (in French first). */
const SMALL_PRINT = [
  { href: "/privacy", name: "Privacy" },
  { href: "/terms", name: "Terms and community rules" },
  { href: "/credits", name: "Credits" },
  { href: "/legal", name: "Mentions légales", lang: "fr" },
];

/** The journal's last page: credits, a reminder that this is a fan site, and the small print. */
export function SiteFooter() {
  return (
    <footer className="bg-paper paper-grain border-line relative z-40 overflow-hidden border-t" id="site-footer">
      <PressedFlower className="absolute -bottom-6 left-[6%] hidden h-40 w-24 -rotate-[18deg] md:block" color="#C94F6D" kind="rose" />
      <PressedFlower className="absolute right-[7%] -bottom-8 hidden h-44 w-24 rotate-[14deg] md:block" color="#6F8A55" kind="fern" />

      <div className="relative mx-auto flex w-full max-w-[1240px] flex-col items-center gap-4 px-4 pt-12 pb-10 text-center sm:px-8">
        <Bracelet className="rotate-[1.5deg]" size="sm" word="Long Live" />
        <p className="font-hand max-w-[30rem] text-[24px] leading-snug font-bold">
          kept with glitter gel pens, by a fan, for fans. <Highlight color="#F9D9E3">this is NOT Taylor&apos;s version.</Highlight>
        </p>
        <p className="text-soft max-w-[40rem] text-[14px] leading-relaxed">
          {/* Deezer's API terms: its logo, clearly visible, and the previews' terms told to listeners (IV). */}
          Album data, covers and 30-second previews courtesy of{" "}
          <a className="text-ink focus-ring rounded-sm font-semibold underline underline-offset-2" href="https://www.deezer.com/">
            <DeezerLogo />
          </a>
          , for private listening only. An unofficial fan site, not affiliated with Taylor Swift, her team or her labels; its photos and footage belong to their
          owners.
        </p>
        <nav aria-label="The small print">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-[14px]">
            {SMALL_PRINT.map(({ href, name, lang }) => (
              <li key={href} lang={lang}>
                <Link className="text-ink focus-ring inline-flex min-h-11 items-center rounded-sm font-semibold underline underline-offset-2" href={href}>
                  {name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
