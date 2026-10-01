import type { ReactNode } from "react";

import Image from "next/image";

import {
  Arrow,
  Bracelet,
  Button,
  ButtonLink,
  Highlight,
  Paper,
  Pin,
  Polaroid,
  PressedFlower,
  RubberStamp,
  RuledList,
  RuledListItem,
  Scribble,
  StickyNote,
  TicketStub,
  WashiTape,
} from "@/components/scrapbook";
import { HOME_PHOTO } from "@/lib/credits";
import { ERA_LOOKS, type EraSlug, FLOWERS, paperTexture } from "@/lib/eras";
import { cn } from "@/lib/utils";

// The home page's photo, a free-licensed one (lib/credits.ts).
const PHOTO = HOME_PHOTO.src;
const PHOTO_ALT = HOME_PHOTO.alt;

/** Every kit component, in whatever Era surrounds it. */
export function KitSpread({ era }: { era?: EraSlug }) {
  const look = era ? ERA_LOOKS[era] : undefined;
  const texture = paperTexture(look);

  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-flow-dense lg:grid-cols-3">
      <Specimen name="Paper">
        <div className="grid grid-cols-3 gap-3">
          <Swatch label={`page (${texture})`}>
            <Paper className="h-20 border border-line" variant={texture} />
          </Swatch>
          <Swatch label="card">
            <Paper className="h-20 border border-line" tone="card" variant={texture === "dark" ? "dark" : "grain"} />
          </Swatch>
          <Swatch label="kraft">
            <Paper className="h-20" tone="kraft" />
          </Swatch>
        </div>
      </Specimen>

      <Specimen name="Washi tape">
        <div className="bg-card relative h-24">
          <WashiTape className="top-4 left-4" rotate={-6} />
          <WashiTape className="top-10 right-4" color="rgba(242,181,200,.6)" rotate={5} width={110} />
          <WashiTape className="bottom-3 left-1/4" color="rgba(159,211,199,.6)" rotate={-2} width={80} />
        </div>
      </Specimen>

      <Specimen name="Pin">
        <div className="bg-kraft paper-grain relative h-24">
          <Pin className="top-8 left-[18%]" />
          <Pin className="top-12 left-[45%]" color="#3D6FB4" />
          <Pin className="top-6 left-[72%]" color="var(--accent)" />
        </div>
      </Specimen>

      <Specimen className="lg:row-span-2" name="Polaroid">
        <Polaroid lift taped caption="the folklore dress. I sobbed." className="mx-auto w-[82%]" credit={HOME_PHOTO.credit} tilt={2.5}>
          <div className="relative aspect-[4/5]">
            <Image fill alt={PHOTO_ALT} className="object-cover object-[50%_40%]" sizes="(min-width: 1024px) 300px, 80vw" src={PHOTO} />
          </div>
        </Polaroid>
      </Specimen>

      <Specimen name="Bracelet">
        <div className="flex flex-col items-center gap-5 py-4">
          <Bracelet beads="era" word={look?.name.split(" ").length === 1 ? look.name : (look?.short ?? "Secret Garden")} />
          <Bracelet className="-rotate-2" size="sm" word="Swiftie" />
        </div>
      </Specimen>

      <Specimen name="Pressed flowers">
        <div className="flex items-end justify-between">
          {FLOWERS.map((kind, index) => (
            <PressedFlower key={kind} className="h-32 w-[18%]" kind={kind} style={{ rotate: `${(index % 2 ? 1 : -1) * (6 + index * 2)}deg` }} />
          ))}
        </div>
      </Specimen>

      <Specimen name="Scribble">
        <p className="font-hand relative inline-block text-[28px] font-bold">
          pass a note on Swiftter
          <Scribble className="absolute -bottom-1 left-0 h-3 w-full" />
        </p>
      </Specimen>

      <Specimen name="Arrow">
        <div className="flex items-center gap-2">
          <p className="font-hand text-[24px] font-bold">look here</p>
          <Arrow className="h-14 w-24" />
          <Arrow flip className="h-14 w-24 rotate-12" color="var(--accent)" />
        </div>
      </Specimen>

      <Specimen name="Highlight">
        <p className="text-[17px] leading-relaxed">
          The bridge on track 5 is <Highlight>the best bridge she has ever written</Highlight>, and we will not be taking questions.
        </p>
      </Specimen>

      <Specimen name="Sticky note">
        <div className="flex flex-wrap items-start gap-5 pt-3">
          <StickyNote lift className="w-[150px]" tilt={-5}>
            Who is Taylor Swift anyway? <span className="text-pen">EW</span>
          </StickyNote>
          <StickyNote lift attach="tape" className="w-[170px]" tilt={3} tone="era">
            {look?.note ?? "a lot going on at the moment"}
          </StickyNote>
        </div>
      </Specimen>

      <Specimen className="sm:col-span-2" name="Buttons">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Try again</Button>
            <Button aria-disabled arrow>
              Pass it on
            </Button>
            <Button variant="danger">Tear it up</Button>
            <Button variant="text">Keep it</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink arrow intent href="/music" shape="tag">
              Open the music journal
            </ButtonLink>
            <ButtonLink intent href="/swiftter">
              A link, as a button
            </ButtonLink>
          </div>
        </div>
      </Specimen>

      <Specimen name="Rubber stamp">
        <div className="flex justify-center py-2">
          <RubberStamp big="NOT" bottom="Taylor's Version" top="This is" />
        </div>
      </Specimen>

      <Specimen name="Ticket stub">
        <TicketStub
          lift
          className="mx-auto max-w-[340px]"
          kicker="Admit one · floor"
          meta="SEC 13 · ROW 13 · SEAT 13"
          picture={<Image fill alt="" className="object-cover" sizes="120px" src={PHOTO} />}
          title="The Eras Tour"
        />
      </Specimen>

      <Specimen className="sm:col-span-2 lg:col-span-3" name="Ruled list">
        <RuledList className="mx-auto max-w-[640px]" footnote="no skips. don't @ us." title="tracklist (5)">
          {["Love Story", "All Too Well (10 Minute Version)", "Style", "cardigan", "Anti-Hero"].map((song, index) => (
            <RuledListItem key={song}>
              <span className="flex items-center justify-between gap-4">
                <span className="truncate font-medium">{song}</span>
                <span className="text-soft shrink-0 text-[14px] tabular-nums">{["3:55", "10:13", "3:51", "3:59", "3:20"][index]}</span>
              </span>
            </RuledListItem>
          ))}
        </RuledList>
      </Specimen>
    </div>
  );
}

function Specimen({ name, className, children }: { name: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <h3 className="text-soft border-line mb-4 border-b pb-1.5 text-[11px] font-bold tracking-[.24em] uppercase">{name}</h3>
      {children}
    </div>
  );
}

function Swatch({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure>
      {children}
      <figcaption className="text-soft mt-1.5 text-[12px]">{label}</figcaption>
    </figure>
  );
}
