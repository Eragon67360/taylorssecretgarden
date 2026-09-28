import { unstable_cache } from "next/cache";

import { Album, AlbumDetails } from "@/types";

const API_URL = "https://api.deezer.com";

type DeezerAlbum = {
  id: number;
  title: string;
  cover_xl: string;
  release_date: string;
  record_type: string;
};

type DeezerTrack = {
  id: number;
  title: string;
  duration: number;
  preview: string;
  artist: { name: string };
};

type DeezerAlbumDetails = DeezerAlbum & {
  label: string;
  duration: number;
  genres: { data: { name: string }[] };
};

// Deezer's public catalog needs no credentials, but reports failures as
// HTTP 200 with an `error` object in the body.
//
// Responses are kept in Next's data cache for a day: since Next 15 fetches are
// uncached, and every page view would then hit Deezer's rate limit (50
// requests per 5 seconds) within a few visits. The cache wraps the checked
// response, not the raw fetch, so an error body (e.g. "Quota limit exceeded")
// is never cached as if it were data.
//
// Until a response is cached, concurrent page views asking for the same path
// share one request, and "Quota limit exceeded" (error code 4) is retried twice,
// once the rate limit's window has moved on.
const QUOTA_EXCEEDED = 4;
const inFlight = new Map<string, Promise<unknown>>();

function deezerGet<T>(path: string, revalidate = 86400): Promise<T> {
  return unstable_cache(() => fetchOnce<T>(path), ["deezer", path], { revalidate })();
}

function fetchOnce<T>(path: string): Promise<T> {
  let request = inFlight.get(path) as Promise<T> | undefined;

  if (!request) {
    request = fetchDeezer<T>(path).finally(() => inFlight.delete(path));
    inFlight.set(path, request);
  }

  return request;
}

async function fetchDeezer<T>(path: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    const data = await response.json();

    if (response.ok && !data.error) return data;
    if (data.error?.code !== QUOTA_EXCEEDED || attempt === 3) {
      throw new Error(`Deezer ${path} failed: ${data.error?.message ?? response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * attempt + Math.random() * 1000));
  }
}

/** The Albums, in the order asked. Deezer may answer an ID with a regional twin (another ID for the same Album). */
export function getAlbums(albumIds: string[]): Promise<DeezerAlbum[]> {
  return Promise.all(albumIds.map((id) => deezerGet<DeezerAlbum>(`/album/${id}`)));
}

// `/album/{id}` embeds at most 25 tracks, so tracks are fetched separately.
async function getAlbumTracks(albumId: string | number): Promise<DeezerTrack[]> {
  const { data } = await deezerGet<{ data: DeezerTrack[] }>(`/album/${albumId}/tracks?limit=200`);

  return data;
}

export function toAlbum(album: DeezerAlbum): Album {
  return { id: String(album.id), name: album.title, images: [{ url: album.cover_xl }] };
}

export async function getAlbumDetails(albumId: string): Promise<AlbumDetails> {
  const [album, tracks] = await Promise.all([
    deezerGet<DeezerAlbumDetails>(`/album/${albumId}`),
    getAlbumTracks(albumId),
  ]);

  return {
    ...toAlbum(album),
    release_date: album.release_date,
    genres: album.genres.data.map((genre) => genre.name),
    total_duration_ms: album.duration * 1000,
    label: album.label,
    tracks: {
      items: tracks.map((track) => ({
        id: String(track.id),
        name: track.title,
        duration_ms: track.duration * 1000,
        preview_url: track.preview,
        artists: [{ name: track.artist.name }],
      })),
    },
  };
}

/*
  A track's 30-second preview URL. Deezer signs preview URLs for about 15
  minutes, so the day-old URLs in a cached tracklist have usually expired:
  players ask for a fresh one when they play (app/api/preview/[trackId]).
  Cached for 5 minutes, well inside the signature's lifetime.
*/
export async function getTrackPreview(trackId: string): Promise<string | undefined> {
  const track = await deezerGet<DeezerTrack>(`/track/${trackId}`, 300);

  return track.preview || undefined;
}
