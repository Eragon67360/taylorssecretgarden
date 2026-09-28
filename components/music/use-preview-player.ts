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
        stop();
      });
    },
    [trackId, stop],
  );

  return {
    trackId,
    playing,
    position,
    length,
    toggle,
    stop,
    audioProps: {
      ref,
      preload: "none",
      onPlaying: () => setPlaying(true),
      // Switching tracks also fires "pause" (for the old source), after the new
      // one was asked to play: only a player that is still paused has stopped.
      onPause: (event) => {
        if (event.currentTarget.paused) setPlaying(false);
      },
      onEnded: stop,
      onError: () => {
        // A removed source (stop) also reports an error; only a loaded track is a failure.
        if (ref.current?.getAttribute("src")) stop();
      },
      onTimeUpdate: (event) => setPosition(event.currentTarget.currentTime),
      onDurationChange: (event) => {
        const { duration } = event.currentTarget;

        if (Number.isFinite(duration) && duration > 0) setLength(duration);
      },
    },
  };
}
