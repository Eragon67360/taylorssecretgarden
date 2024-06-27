import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type Album = {
  id: string;
  name: string;
  images: { url: string }[];
};

export interface Artist {
  name: string;
}

export interface Track {
  id: string;
  name: string;
  duration_ms: number;
  preview_url: string;
  artists: Artist[];
}

export interface AlbumDetails {
  id: string;
  name: string;
  images: { url: string }[];
  release_date: string;
  genres: string[];
  total_duration_ms: number;
  tracks: { items: Track[] };
  label: string;
}
