"use client";

import dynamic from "next/dynamic";

import { NoteSheet, PAPERS, ruling } from "./note-paper";

/**
 * The composer, in its own chunk: only Members write, so visitors never
 * download the editor. The feed and threads both use this one, with blank
 * lined paper of the same size while it loads.
 */
export const Composer = dynamic(() => import("./composer"), { ssr: false, loading: () => <ComposerPlaceholder /> });

/** Blank lined paper the size of the composer, while it (or the sign-in state) loads. */
export function ComposerPlaceholder() {
  return (
    <div aria-hidden="true" className="relative h-[340px]" style={{ rotate: `${PAPERS.lined.tilt}deg` }}>
      <NoteSheet paper="lined" />
      <div className="relative mt-[76px] h-[224px]" style={ruling("lined")} />
    </div>
  );
}
