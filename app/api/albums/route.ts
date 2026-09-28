import { NextResponse } from "next/server";

import { getAlbums, toAlbum } from '@/service/deezer';

// Curated by Deezer album ID, fetched directly: titles vary with the catalog
// region, and title matching dropped the debut album on Vercel's build machines.
const specifiedAlbumIds = [
    227786,    // Taylor Swift (Deluxe Edition)
    221543452, // Fearless (Taylor's Version)
    461146065, // Speak Now (Taylor's Version)
    504180521, // 1989 (Taylor's Version)
    272247412, // Red (Taylor's Version)
    52612062,  // reputation
    162683632, // folklore
    108447472, // Lover
    192580112, // evermore
    575252501, // THE TORTURED POETS DEPARTMENT: THE ANTHOLOGY
    368474187, // Midnights
];

export async function GET() {
    const albums = await getAlbums(specifiedAlbumIds);

    return NextResponse.json({ items: albums.map(toAlbum) });
}
