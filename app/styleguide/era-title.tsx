import type { EraLook } from "@/lib/eras";

import { ERA_SLUGS } from "@/lib/eras";
import { cn } from "@/lib/utils";

/** An Era's number, year and name in its display face, and its fan note. */
export function EraTitle({ look, className }: { look?: EraLook; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-8 gap-y-2", className)}>
      <div>
        <p className="text-soft text-[11px] font-bold tracking-[.26em] uppercase">
          {look ? `Era No. ${String(ERA_SLUGS.indexOf(look.slug) + 1).padStart(2, "0")} · ${look.year}` : "No Era · the journal itself"}
        </p>
        <h2 className="font-display mt-1 text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.05] break-words">{look?.name ?? "The journal"}</h2>
      </div>
      {look && <p className="font-hand text-soft max-w-[26rem] text-[22px] leading-tight font-bold">{look.note}</p>}
    </div>
  );
}
