import { PressedFlower, Scribble } from "@/components/scrapbook";
import { SwiftterBoard } from "@/components/swiftter/swiftter-board";

/** Swiftter: the page's heading, rendered on the server, over the feed and the composer (client). */
export default function SwiftterPage() {
  return (
    <div className="relative mx-auto w-full max-w-[1120px] overflow-x-clip px-4 pt-10 pb-20 sm:px-8 sm:pt-14">
      <header className="relative mb-12 max-w-[40rem] sm:mb-16">
        <PressedFlower
          className="absolute top-2 -right-3 h-36 w-20 rotate-[22deg] sm:-right-24 sm:h-48 sm:w-28"
          color="#9ab3d6"
          kind="lavender"
        />
        <p className="font-hand text-accent text-[24px] font-bold">page 4 · notes passed in class</p>
        <h1 className="font-serif relative inline-block text-[64px] leading-[0.95] font-semibold tracking-tight sm:text-[88px]">
          Swiftter
          <Scribble className="absolute -bottom-2 left-0 h-4 w-full" color="var(--pen)" />
        </h1>
        <p className="text-soft mt-6 max-w-[34rem] pr-16 text-[17px] leading-relaxed sm:pr-0">
          The fan feed. Theories, easter eggs, 3am thoughts, scribbled on whatever paper was closest. Be kind, or at least be
          reputation about it.
        </p>
      </header>

      <SwiftterBoard />
    </div>
  );
}
