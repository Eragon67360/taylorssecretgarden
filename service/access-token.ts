import querystring from 'querystring';

if (!process.env.SPOTIFY_CLIENT_ID) {
  throw new Error("Missing NEXT_SPOTIFY_CLIENT_ID");
}

if (!process.env.SPOTIFY_CLIENT_SECRET) {
  throw new Error("Missing SPOTIFY_CLIENT_SECRET");
}

const client_id = process.env.SPOTIFY_CLIENT_ID as string;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET as string;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

const basic = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;


export const getAccessToken = async () => {
  // const response = await fetch('https://accounts.spotify.com/api/token', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/x-www-form-urlencoded',
  //     'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
  //   },
  //   body: 'grant_type=client_credentials',
  // });

  // const data = await response.json();
  // return data.access_token;

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: querystring.stringify({
            grant_type: 'refresh_token',
            refresh_token,
        }),
    });
  
    const data = await response.json();
    if (!response.ok) {
        throw new Error(`Spotify token error: ${data.error} - ${data.error_description}`);
    }
    return data;
  } catch (error) {
    console.error('Error fetching access token', error);
    throw error;
  }
};


