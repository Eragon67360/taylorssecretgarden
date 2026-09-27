import { Album, AlbumDetails } from "@/types";

const API_URL = "https://api.deezer.com";
export const TAYLOR_SWIFT_ARTIST_ID = 12246;

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
async function deezerGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Deezer ${path} failed: ${data.error?.message ?? response.status}`);
  }

  return data;
}

export async function getArtistAlbums(artistId: number): Promise<DeezerAlbum[]> {
  const { data } = await deezerGet<{ data: DeezerAlbum[] }>(`/artist/${artistId}/albums?limit=200`);

  // Newest first, like the Spotify endpoint this replaces.
  return data.sort((a, b) => b.release_date.localeCompare(a.release_date));
}

// `/album/{id}` embeds at most 25 tracks, so tracks are fetched separately.
export async function getAlbumTracks(albumId: string | number): Promise<DeezerTrack[]> {
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
