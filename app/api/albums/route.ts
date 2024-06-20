// import { getAccessToken } from '@/service/access-token';
import { getAccessToken } from '@/service/access-token';
import { NextRequest, NextResponse } from 'next/server';


async function fetchAllAlbums(access_token: string | null) {
    let albums: any[] = [];
    let nextUrl = 'https://api.spotify.com/v1/artists/06HL4z0CvFAxyc27GXpf02/albums?limit=50';

    const response = await fetch(nextUrl, {
        headers: {
            'Authorization': `Bearer ${access_token}` ,
        },
    });

    const data = await response.json();
    albums = albums.concat(data.items);
    nextUrl = data.next;

    const filteredAlbums = albums.filter(album => [
        'Taylor Swift (Deluxe Edition)',
        'Fearless (Taylor\'s Version)',
        'Speak Now (Taylor\'s Version)',
        '1989 (Taylor\'s Version)',
        'Red (Taylor\'s Version)',
        'reputation',
        'folklore',
        'Lover',
        'evermore'
    ].includes(album.name));

    return filteredAlbums;
    

    return albums;
}


export async function GET(req: NextRequest, res: NextResponse) {
    const {access_token} = await getAccessToken();

    const albums = await fetchAllAlbums(access_token);

    return NextResponse.json({ items: albums });
}
