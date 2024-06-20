// import { getAccessToken } from '@/service/access-token';
import { getAccessToken } from '@/service/access-token';
import { NextRequest, NextResponse } from 'next/server';

const client_id = process.env.SPOTIFY_CLIENT_ID as string;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET as string;

export async function GET(req: NextRequest, res: NextResponse) {
    const {access_token} = await getAccessToken();
    const albumId = req.nextUrl.pathname.split('/').pop();
    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
        headers: {
            'Authorization': `Bearer ${access_token}` ,
        },
    });

    const data = await response.json();
    return NextResponse.json(data);
}
