import { unstable_cache } from "next/cache";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { Album, AlbumDetails } from "@/types";

const API_URL = "https://api.deezer.com";

export type DeezerAlbum = {
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
// once the rate limit's window has moved on. While the site is being built,
// five times: the build asks for every Music page's data at once, and has
// time to wait.
//
// Each request gives up after 5 seconds: a hung Deezer would otherwise hold
// the page's render until the function's time limit. Deezer usually answers
// well within a second, and the Music page has fallbacks (components/music/catalogue.ts).
const QUOTA_EXCEEDED = 4;
const ATTEMPTS = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD ? 6 : 3;
const TIMEOUT_MS = 5000;
const DAY = 86400;
const inFlight = new Map<string, Promise<unknown>>();

export function deezerGet<T>(path: string, revalidate = DAY): Promise<T> {
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

/*
  At most MAX_REQUESTS requests to Deezer at once, per server process; the
  others wait their turn (their 5 seconds start when they go). A build
  prerenders every Album and Version page at once, in as many processes as
  the machine has cores: on a cold cache, a burst of hundreds of requests,
  which Deezer answers slowly enough to time out.
*/
const MAX_REQUESTS = 4;
let requests = 0;
const queue: (() => void)[] = [];

async function withSlot<T>(request: () => Promise<T>): Promise<T> {
  // A finished request hands its slot straight to the next in the queue.
  if (requests < MAX_REQUESTS) requests++;
  else await new Promise<void>((resolve) => queue.push(resolve));
  try {
    return await request();
  } finally {
    const next = queue.shift();

    if (next) next();
    else requests--;
  }
}

async function fetchDeezer<T>(path: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const { response, data } = await withSlot(async () => {
      const response = await fetch(`${API_URL}${path}`, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });

      return { response, data: await response.json() };
    });

    if (response.ok && !data.error) return data;
    if (data.error?.code !== QUOTA_EXCEEDED || attempt === ATTEMPTS) {
      throw new Error(`Deezer ${path} failed: ${data.error?.message ?? response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * attempt + Math.random() * 1000));
  }
}

/** An Album. Deezer may answer its ID with a regional twin (another ID for the same Album). */
export function getAlbum(albumId: string): Promise<DeezerAlbum> {
  return deezerGet<DeezerAlbum>(`/album/${albumId}`);
}

/** The Albums, in the order asked; fails if any of them does. */
export function getAlbums(albumIds: string[]): Promise<DeezerAlbum[]> {
  return Promise.all(albumIds.map((id) => getAlbum(id)));
}

// `/album/{id}` embeds at most 25 tracks, so tracks are fetched separately.
export async function getAlbumTracks(albumId: string | number): Promise<DeezerTrack[]> {
  const { data } = await deezerGet<{ data: DeezerTrack[] }>(`/album/${albumId}/tracks?limit=200`);

  return data;
}

export function toAlbum(album: DeezerAlbum): Album {
  return { id: String(album.id), name: album.title, images: [{ url: album.cover_xl }] };
}

/*
  An Album's (or a Version's) details and tracklist, cached as one entry: a
  warm Album page reads it once rather than the Album and its tracks apart.
  Next skips a cache nested in another, so on a miss the two requests inside
  go to Deezer directly, still deduplicated and retried by fetchOnce.
*/
export function getAlbumDetails(albumId: string): Promise<AlbumDetails> {
  return cachedAlbumDetails(albumId);
}

const cachedAlbumDetails = unstable_cache((albumId: string) => fetchAlbumDetails(albumId), ["deezer", "album-details"], { revalidate: DAY });

async function fetchAlbumDetails(albumId: string): Promise<AlbumDetails> {
  const [album, tracks] = await Promise.all([deezerGet<DeezerAlbumDetails>(`/album/${albumId}`), getAlbumTracks(albumId)]);

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
