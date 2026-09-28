"use client";

import { useState } from "react";

import { EraScope } from "@/components/era-scope";
import { ERAS, ERA_LOOKS, type EraSlug } from "@/lib/eras";
import { cn } from "@/lib/utils";

import { EraTitle } from "./era-title";
import { KitSpread } from "./kit-spread";

/**
 * The kit in any Era, re-coloured in place: the container's variables change
 * and the colours fade across (instantly under reduced motion). Picking an
 * Era is also what downloads its display face.
 */
export function EraSandbox() {
  const [era, setEra] = useState<EraSlug>("debut");

  return (
    <EraScope aria-label="Era sandbox" as="section" className="overflow-x-clip px-4 py-12 sm:px-8" era={era}>
      <div className="mx-auto max-w-[1176px]">
        <fieldset>
          <legend className="text-soft mb-3 text-[11px] font-bold tracking-[.24em] uppercase">Era sandbox · pick an Era</legend>
          <div className="flex flex-wrap gap-2">
            {ERAS.map((look) => (
              <label
                key={look.slug}
                className={cn(
                  "relative flex min-h-11 items-center rounded-full border px-4 text-[14px] font-semibold",
                  look.slug === era ? "border-accent bg-accent text-on-accent" : "border-line bg-card text-ink",
                )}
              >
                <input
                  checked={look.slug === era}
                  className="focus-ring absolute inset-0 cursor-pointer appearance-none rounded-full"
                  name="era"
                  type="radio"
                  value={look.slug}
                  onChange={() => setEra(look.slug)}
                />
                {look.name}
              </label>
            ))}
          </div>
        </fieldset>

        <EraTitle className="mt-10" look={ERA_LOOKS[era]} />
        <div className="mt-8">
          <KitSpread era={era} />
        </div>
      </div>
    </EraScope>
  );
}
