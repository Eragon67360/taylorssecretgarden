import { cn } from "@/lib/utils";

type RubberStampProps = {
  /** Small caps line above the big word. */
  top: string;
  /** The big italic word in the middle. */
  big: string;
  /** Small caps line below. */
  bottom: string;
  /** Degrees. */
  tilt?: number;
  /** Ink colour; defaults to the pen red. */
  color?: string;
  className?: string;
};

/**
 * A round rubber stamp inked onto the page. Read out as one phrase
 * ("Stamp: This is NOT Taylor's Version").
 */
export function RubberStamp({ top, big, bottom, tilt = -14, color = "var(--pen)", className }: RubberStampProps) {
  return (
    <div
      aria-label={`Stamp: ${top} ${big} ${bottom}`}
      className={cn(
        "grid size-[124px] place-items-center rounded-full border-[3px] text-center sm:size-[132px]",
        "bg-[rgba(255,250,240,.86)] [mask-image:radial-gradient(circle_at_30%_40%,#000_60%,rgba(0,0,0,.82)_100%)]",
        className,
      )}
      role="img"
      style={{
        rotate: `${tilt}deg`,
        color,
        borderColor: color,
        boxShadow: `inset 0 0 0 4px rgba(255,250,240,.86), inset 0 0 0 5.5px ${color}`,
      }}
    >
      <span className="px-3 text-[11px] leading-tight font-extrabold tracking-[.12em] uppercase sm:text-[11.5px]">
        {top}
        <span className="font-serif-italic block text-[28px] leading-none tracking-normal sm:text-[30px]">{big}</span>
        {bottom}
      </span>
    </div>
  );
}
