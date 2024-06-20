import { getAccessToken } from '@/service/access-token';
import { NextRequest, NextResponse } from 'next/server';

interface Track {
    name: string;
}

interface Album {
    id: string;
    name: string;
    images: { url: string }[];
    artists: { id: string }[];
}

interface Variant {
    album: string;
    cover: string;
    newTracks: string[];
}

async function fetchAlbumTracks(access_token: string | null, albumId: string | undefined) {
    const albumUrl = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;
    const response = await fetch(albumUrl, {
        headers: {
            'Authorization': `Bearer ${access_token}`,
        },
    });
    const data = await response.json();
    return data.items.map((track: any) => track.name);
}

async function fetchAlbumVariants(access_token: string | null, albumId: string | undefined) {
    let variants: any[] = [];
    const albumUrl = `https://api.spotify.com/v1/albums/${albumId}`;

    const response = await fetch(albumUrl, {
        headers: {
            'Authorization': `Bearer ${access_token}`,
        },
    });

    const albumData: Album = await response.json();
    const albumName = albumData.name.replace(/\(.*?\)|\[.*?\]/g, '').trim(); // Remove text within parentheses or brackets
    const artistId = albumData.artists[0].id;
    const groundAlbumTracks = await fetchAlbumTracks(access_token, albumId);


    // Fetch all albums of the artist to find variants
    let nextUrl = `https://api.spotify.com/v1/artists/${artistId}/albums?limit=50`;
    while (nextUrl) {
        const response = await fetch(nextUrl, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
            },
        });

        const data = await response.json();
        variants = variants.concat(data.items);
        nextUrl = data.next;
    }

    // Filter the variants that are related to the original album
    const filteredVariants = variants.filter(variant => variant.name.includes(albumName));

    // Check for bonus tracks in the variants
    const bonusTracks: Variant[] = [];
    for (const variant of filteredVariants) {
        const variantTracks = await fetchAlbumTracks(access_token, variant.id);
        const newTracks = variantTracks.filter((track: any) => !groundAlbumTracks.includes(track));
        if (newTracks.length > 0) {
            bonusTracks.push({
                album: variant.name,
                cover: variant.images[0]?.url || '',
                newTracks,
            });
        }
    }


    return { filteredVariants, bonusTracks };
}

export async function GET(req: NextRequest, res: NextResponse) {

    const { access_token } = await getAccessToken();
    const albumId = req.nextUrl.pathname.split('/')[2]; // Extract albumId from the given pathname

    const { filteredVariants, bonusTracks } = await fetchAlbumVariants(access_token, albumId);

    return NextResponse.json({ filteredVariants, bonusTracks });
}
