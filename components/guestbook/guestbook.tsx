import type { ReactNode } from "react";

import { Paper, PressedFlower, Scribble, WashiTape } from "@/components/scrapbook";

type GuestbookProps = {
  /** A handwritten line under the heading. */
  note: string;
  /** Clerk's <SignIn> or <SignUp>, themed with `guestbookAppearance`. */
  children: ReactNode;
};

/**
 * The guestbook spread shared by sign-in and sign-up: a handwritten "Sign the
 * guestbook" heading on the journal's paper, and a taped card on a kraft page,
 * pressed flowers tucked under its corners, holding Clerk's form.
 */
export function Guestbook({ note, children }: GuestbookProps) {
  return (
    <Paper className="overflow-x-clip px-4 pt-10 pb-16 sm:px-8 md:pt-14 md:pb-24">
      <div className="mx-auto w-full max-w-[440px]">
        <header className="relative mb-9 text-center">
          <h1 className="font-hand text-ink text-[clamp(3rem,12vw,4.25rem)] leading-[0.95] font-bold">Sign the guestbook</h1>
          <Scribble className="mx-auto mt-1 h-3.5 w-56" />
          <p className="font-hand text-soft mt-3 text-[1.45rem] leading-tight">{note}</p>
        </header>

        <div className="relative">
          <PressedFlower
            className="absolute -top-16 -left-16 hidden h-44 w-28 -rotate-[28deg] sm:block"
            kind="daisy"
          />
          <PressedFlower
            className="absolute -right-12 -bottom-10 hidden h-40 w-24 rotate-[18deg] md:block"
            color="var(--stem)"
            kind="fern"
          />
          {/* The page underneath, peeking out at an angle. */}
          <Paper
            aria-hidden="true"
            className="absolute inset-0 rotate-[2.2deg] shadow-[0_8px_18px_-8px_rgba(60,40,20,.3)]"
            tone="kraft"
          />
          <Paper
            className="relative px-5 pt-9 pb-6 shadow-[0_1px_2px_rgba(60,40,20,.12),0_14px_28px_-10px_rgba(60,40,20,.35)] sm:px-8"
            tone="card"
          >
            <WashiTape className="-top-3 left-1/2 -ml-14" rotate={-3} width={112} />
            {children}
          </Paper>
        </div>
      </div>
    </Paper>
  );
}
