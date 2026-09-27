import { getArtistAlbums, TAYLOR_SWIFT_ARTIST_ID, toAlbum } from '@/service/deezer';
import { NextResponse } from "next/server";

const specifiedAlbums = [
    'Taylor Swift (Deluxe Edition)',
    'Fearless (Taylor\'s Version)',
    'Speak Now (Taylor\'s Version)',
    '1989 (Taylor\'s Version)',
    'Red (Taylor\'s Version)',
    'reputation',
    'folklore',
    'Lover',
    'evermore',
    'The Tortured Poets Department: The Anthology'.toUpperCase(),
    'Midnights'
];

export async function GET() {
    const albums = await getArtistAlbums(TAYLOR_SWIFT_ARTIST_ID);
    const filteredAlbums = albums.filter(album => specifiedAlbums.includes(album.title));

    return NextResponse.json({ items: filteredAlbums.map(toAlbum) });
}
