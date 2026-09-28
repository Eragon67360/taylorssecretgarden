import { cn } from "@/lib/utils";

const SIZES = {
  sm: { letter: "size-6 text-[11px]", bead: "size-3" },
  md: { letter: "size-7 text-sm", bead: "size-4" },
  lg: { letter: "size-9 text-lg", bead: "size-5" },
} as const;

/** The pastel mix of a friendship bracelet traded at the Eras Tour. */
const RAINBOW = ["#F2B5C8", "#F7D774", "#9FD3C7", "#B9A6E8", "#F4A07A", "#9CC8E8"];
/** The current Era's accent, full and pale. */
const ERA_BEADS = ["var(--accent)", "color-mix(in srgb, var(--accent) 45%, white)"];

type BraceletProps = {
  /** The word(s) spelled in letter beads; also the accessible name. */
  word: string;
  size?: keyof typeof SIZES;
  /** Spacer beads: the pastel mix or the current Era's accent. */
  beads?: "rainbow" | "era";
  className?: string;
};

// A stable, hand-strung wobble per letter (the same on server and client).
const wobble = (letter: number, word: number) => ((letter * 37 + word * 11) % 7) - 3;

/**
 * A friendship bracelet of letter beads. Screen readers get the word once
 * (role="img"); the beads themselves are decoration.
 */
export function Bracelet({ word, size = "md", beads = "rainbow", className }: BraceletProps) {
  const { letter, bead } = SIZES[size];
  const colours = beads === "era" ? ERA_BEADS : RAINBOW;
  const words = word.toUpperCase().split(/\s+/).filter(Boolean);
  let spacer = 0;
  const nextBead = () => colours[spacer++ % colours.length];

  return (
    <div aria-label={word} className={cn("relative inline-flex max-w-full flex-wrap items-center justify-center gap-y-2", className)} role="img">
      {words.map((text, wordIndex) => (
        <span key={wordIndex} aria-hidden="true" className="relative flex items-center">
          <span className="absolute inset-x-[-6px] top-1/2 h-[2px] -translate-y-1/2 bg-[color-mix(in_srgb,var(--ink)_35%,transparent)]" />
          <Bead className={bead} colour={nextBead()} />
          {[...text].map((character, letterIndex) => (
            <span
              key={letterIndex}
              className={cn(
                "font-body relative mx-[1.5px] grid place-items-center rounded-[6px] font-bold leading-none text-[#1c1c1c]",
                "bg-[linear-gradient(160deg,#ffffff_0%,#fffdf7_55%,#e6e2d9_100%)] shadow-[inset_0_-2px_0_rgba(0,0,0,.08),0_1px_2px_rgba(0,0,0,.18)]",
                letter,
              )}
              style={{ rotate: `${wobble(letterIndex, wordIndex)}deg` }}
            >
              {character}
            </span>
          ))}
          {wordIndex === words.length - 1 && <Bead className={bead} colour={nextBead()} />}
        </span>
      ))}
    </div>
  );
}

function Bead({ className, colour }: { className: string; colour: string }) {
  return (
    <span
      className={cn("relative mx-[2px] rounded-full", className)}
      style={{ background: `radial-gradient(circle at 35% 30%, #fff8 0 15%, ${colour} 45%)` }}
    />
  );
}
