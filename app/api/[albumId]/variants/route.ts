import { getAlbumDetails, getAlbumTracks, getArtistAlbums, TAYLOR_SWIFT_ARTIST_ID, toAlbum } from '@/service/deezer';
import { NextRequest, NextResponse } from "next/server";

interface Variant {
    album: string;
    cover: string;
    newTracks: string[];
}

async function fetchAlbumVariants(albumId: string) {
    const album = await getAlbumDetails(albumId);
    const albumName = album.name.replace(/\(.*?\)|\[.*?\]/g, '').trim(); // Remove text within parentheses or brackets
    const groundAlbumTracks = album.tracks.items.map(track => track.name);

    // Albums of the artist whose title contains the original album's name
    const variants = (await getArtistAlbums(TAYLOR_SWIFT_ARTIST_ID))
        .filter(variant => variant.title.includes(albumName));

    // Check for bonus tracks in the variants
    const bonusTracks: Variant[] = [];
    for (const variant of variants) {
        const variantTracks = (await getAlbumTracks(variant.id)).map(track => track.title);
        const newTracks = variantTracks.filter(track => !groundAlbumTracks.includes(track));
        if (newTracks.length > 0) {
            bonusTracks.push({ album: variant.title, cover: variant.cover_xl, newTracks });
        }
    }

    return { filteredVariants: variants.map(toAlbum), bonusTracks };
}

export async function GET(req: NextRequest) {
    const albumId = req.nextUrl.pathname.split('/')[2] ?? ''; // Extract albumId from the given pathname

    return NextResponse.json(await fetchAlbumVariants(albumId));
}
