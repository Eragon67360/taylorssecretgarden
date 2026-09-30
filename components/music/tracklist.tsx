"use client";

import type { PreviewPlayer } from "./use-preview-player";
import type { Track } from "@/types";

import { RuledList, RuledListItem, WashiTape } from "@/components/scrapbook";
import { cn } from "@/lib/utils";

import { formatTrackTime } from "./format";

type TracklistProps = {
  /** Undefined while the Album is loading. */
  tracks: Track[] | undefined;
  player: PreviewPlayer;
};

/** An Album's tracks on a notebook page, each with a 30-second preview. */
export function Tracklist({ tracks, player }: TracklistProps) {
  const failedTrack = player.lastFailed ? tracks?.find(({ id }) => id === player.lastFailed) : undefined;

  return (
    <div className="relative">
      {/* Always on the page, so a screen reader hears a failed preview when its message is put in. */}
      <p aria-live="polite" className="sr-only" role="status">
        {failedTrack && `Preview of ${failedTrack.name} unavailable.`}
      </p>
      <WashiTape className="-top-3 right-10" rotate={4} width={90} />
      <p aria-hidden="true" className="text-soft absolute top-7 right-5 z-10 hidden text-[10.5px] font-bold tracking-[.2em] uppercase sm:block">
        ▶ 30-sec previews
      </p>
      <RuledList
        aria-busy={!tracks}
        aria-label="Tracklist"
        footnote={tracks && (tracks.length > 20 ? "yes, all of them. we counted twice." : "no skips. don't @ us.")}
        title={tracks ? `tracklist (${tracks.length})` : "tracklist"}
      >
        {tracks
          ? tracks.map((track) => <TrackLine key={track.id} player={player} track={track} />)
          : Array.from({ length: 10 }, (_, index) => (
              <RuledListItem key={index} aria-hidden="true">
                <span className="bg-line block h-3 rounded-full motion-safe:animate-pulse" style={{ width: `${40 + ((index * 23) % 45)}%` }} />
              </RuledListItem>
            ))}
      </RuledList>
    </div>
  );
}

function TrackLine({ track, player }: { track: Track; player: PreviewPlayer }) {
  const loaded = player.trackId === track.id;
  const playing = loaded && player.playing;
  const canPlay = !!track.preview_url;
  const failed = !playing && player.failed.has(track.id);

  return (
    <RuledListItem>
      <div className="flex items-center gap-3">
        <button
          aria-label={`${playing ? "Pause" : "Play"} preview of ${track.name}`}
          className={cn(
            "focus-ring grid size-8 shrink-0 place-items-center rounded-full border-[1.5px] disabled:opacity-40",
            "motion-safe:transition-[scale,background-color] motion-safe:duration-150 motion-safe:hover:scale-110 motion-safe:active:scale-90",
            playing ? "border-accent bg-accent text-on-accent" : "border-soft text-soft",
          )}
          disabled={!canPlay}
          type="button"
          onClick={() => player.toggle(track.id)}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <span className="relative min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline text-[15.5px] font-medium sm:text-base">
            <span
              className="min-w-0 truncate rounded-[2px] px-1 py-0.5 [background-position:0_70%] bg-no-repeat motion-safe:transition-[background-size] motion-safe:duration-500"
              style={{
                backgroundImage:
                  "linear-gradient(100deg, transparent 0 1%, color-mix(in srgb, var(--accent) 34%, transparent) 3% 96%, transparent 99%)",
                backgroundSize: loaded ? "100% 70%" : "0% 70%",
              }}
            >
              {track.name}
            </span>
            {playing && (
              // On a phone the title keeps the room; the pencil line and the pause button show it is playing.
              <span className="font-hand text-soft ml-2 hidden shrink-0 text-[18px] font-bold sm:inline">
                <span aria-hidden="true">← </span>now playing
              </span>
            )}
            {failed && (
              // Kept on a phone too: without it the button just flips back to Play.
              <span className="font-hand text-soft ml-2 shrink-0 text-[17px] leading-none font-bold sm:text-[18px]" data-preview-unavailable="">
                preview unavailable
              </span>
            )}
          </span>
          {loaded && <PreviewProgress length={player.length} name={track.name} position={player.position} />}
        </span>
        <span className="text-soft shrink-0 text-[14px] tabular-nums">{formatTrackTime(track.duration_ms)}</span>
      </div>
    </RuledListItem>
  );
}

/**
 * How far into the 30-second preview the player is: a pencil line under the
 * title, in ink (the Era accent is too faint against the track on some papers).
 */
function PreviewProgress({ name, position, length }: { name: string; position: number; length: number }) {
  const seconds = Math.floor(position);

  return (
    <span
      aria-label={`Preview of ${name}`}
      aria-valuemax={Math.round(length)}
      aria-valuemin={0}
      aria-valuenow={seconds}
      aria-valuetext={`${seconds} of ${Math.round(length)} seconds`}
      className="bg-line absolute right-0 -bottom-1.5 left-1 block h-[3px] overflow-hidden rounded-full"
      role="progressbar"
    >
      <span
        className="bg-ink block h-full origin-left rounded-full motion-safe:transition-[scale] motion-safe:duration-300 motion-safe:ease-linear"
        style={{ scale: `${Math.min(position / length, 1)} 1` }}
      />
    </span>
  );
}

/** The play and pause marks on a track's button (decorative: the button is labelled). */
function PlayIcon() {
  return (
    <svg aria-hidden="true" className="translate-x-px" fill="currentColor" height="10" viewBox="0 0 10 12" width="9">
      <path d="M0 .8v10.4a.8.8 0 0 0 1.2.7l8.4-5.2a.8.8 0 0 0 0-1.4L1.2.1A.8.8 0 0 0 0 .8Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="11" viewBox="0 0 10 12" width="9">
      <rect height="12" rx="1" width="3.5" x="0.5" />
      <rect height="12" rx="1" width="3.5" x="6" />
    </svg>
  );
}
