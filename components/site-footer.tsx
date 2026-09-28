import { Bracelet, Highlight, PressedFlower } from "@/components/scrapbook";

/** The journal's last page: credits, and a reminder that this is a fan site. */
export function SiteFooter() {
  return (
    <footer className="bg-paper paper-grain border-line relative z-40 overflow-hidden border-t" id="site-footer">
      <PressedFlower className="absolute -bottom-6 left-[6%] hidden h-40 w-24 -rotate-[18deg] md:block" color="#C94F6D" kind="rose" />
      <PressedFlower className="absolute right-[7%] -bottom-8 hidden h-44 w-24 rotate-[14deg] md:block" color="#6F8A55" kind="fern" />

      <div className="relative mx-auto flex w-full max-w-[1240px] flex-col items-center gap-4 px-4 pt-12 pb-10 text-center sm:px-8">
        <Bracelet className="rotate-[1.5deg]" size="sm" word="Long Live" />
        <p className="font-hand max-w-[30rem] text-[24px] leading-snug font-bold">
          kept with glitter gel pens, by a fan, for fans.{" "}
          <Highlight color="#F9D9E3">this is NOT Taylor&apos;s version.</Highlight>
        </p>
        <p className="text-soft max-w-[40rem] text-[14px] leading-relaxed">
          Album data and 30-second previews courtesy of{" "}
          <a className="text-ink focus-ring rounded-sm font-semibold underline underline-offset-2" href="https://www.deezer.com/">
            Deezer
          </a>
          . An unofficial fan site, not affiliated with Taylor Swift, her team or her labels.
        </p>
      </div>
    </footer>
  );
}
