"use client";

import { type AudioHTMLAttributes, type RefObject, useCallback, useRef, useState } from "react";

/** Deezer previews are 30 seconds long; the real length replaces this once known. */
const PREVIEW_SECONDS = 30;

export type PreviewPlayer = {
  /** The track loaded in the player (playing or paused), if any. */
  trackId: string | null;
  playing: boolean;
  /** Seconds into the preview, and its length. */
  position: number;
  length: number;
  /** Tracks whose preview failed to play (until one of them plays after all). */
  failed: ReadonlySet<string>;
  /** The track whose preview failed last, to announce; a track failing again is not announced again. */
  lastFailed: string | null;
  /** Plays a track's preview, or pauses it when it is the one playing. */
  toggle: (trackId: string) => void;
  /** Stops and unloads the player. */
  stop: () => void;
  /** Spread onto the page's single <audio> element. */
  audioProps: AudioHTMLAttributes<HTMLAudioElement> & { ref: RefObject<HTMLAudioElement | null> };
};

/**
 * 30-second previews through one audio element, so only one track ever
 * plays: starting a track replaces whatever was loaded. Previews are fetched
 * freshly signed from /api/preview/<trackId>.
 */
export function usePreviewPlayer(): PreviewPlayer {
  const ref = useRef<HTMLAudioElement>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [length, setLength] = useState(PREVIEW_SECONDS);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [lastFailed, setLastFailed] = useState<string | null>(null);
  // The same failure can be reported twice (play() rejects and the element
  // fires "error"): the ref sees the first report before a re-render.
  const failedRef = useRef<ReadonlySet<string>>(failed);

  const stop = useCallback(() => {
    const audio = ref.current;

    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setTrackId(null);
    setPlaying(false);
    setPosition(0);
    setLength(PREVIEW_SECONDS);
  }, []);

  /** A track's preview would not play: stop, and remember it (said on its line, and announced once). */
  const fail = useCallback(
    (id: string) => {
      stop();
      if (failedRef.current.has(id)) return;
      failedRef.current = new Set(failedRef.current).add(id);
      setFailed(failedRef.current);
      setLastFailed(id);
    },
    [stop],
  );

  /** A track that failed before plays after all. */
  const recover = useCallback((id: string) => {
    if (!failedRef.current.has(id)) return;
    const rest = new Set(failedRef.current);

    rest.delete(id);
    failedRef.current = rest;
    setFailed(rest);
    setLastFailed((last) => (last === id ? null : last));
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const audio = ref.current;

      if (!audio) return;
      if (id === trackId && !audio.paused) {
        audio.pause();

        return;
      }
      if (id !== trackId) {
        audio.src = `/api/preview/${id}`;
        setTrackId(id);
        setPosition(0);
        setLength(PREVIEW_SECONDS);
      }
      // Show the track as playing right away; the audio events correct it.
      setPlaying(true);
      audio.play().catch((error: unknown) => {
        // Replaced by another track before it started: not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
        fail(id);
      });
    },
    [trackId, fail],
  );

  return {
    trackId,
    playing,
    position,
    length,
    failed,
    lastFailed,
    toggle,
    stop,
    audioProps: {
      ref,
      preload: "none",
      onPlaying: () => {
        setPlaying(true);
        if (trackId) recover(trackId);
      },
      // Switching tracks also fires "pause" (for the old source), after the new
      // one was asked to play: only a player that is still paused has stopped.
      onPause: (event) => {
        if (event.currentTarget.paused) setPlaying(false);
      },
      onEnded: stop,
      onError: (event) => {
        // A removed source (stop) also reports an error; only a loaded track is a failure.
        const failedId = event.currentTarget.getAttribute("src")?.match(/\/api\/preview\/(\d+)$/)?.[1];

        if (failedId) fail(failedId);
      },
      onTimeUpdate: (event) => setPosition(event.currentTarget.currentTime),
      onDurationChange: (event) => {
        const { duration } = event.currentTarget;

        if (Number.isFinite(duration) && duration > 0) setLength(duration);
      },
    },
  };
}
