import querystring from "querystring";

if (!process.env.SPOTIFY_CLIENT_ID) {
  throw new Error("Missing SPOTIFY_CLIENT_ID");
}

if (!process.env.SPOTIFY_CLIENT_SECRET) {
  throw new Error("Missing SPOTIFY_CLIENT_SECRET");
}

const client_id = process.env.SPOTIFY_CLIENT_ID as string;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET as string;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

const basic = Buffer.from(`${client_id}:${client_secret}`).toString("base64");
const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;

export const getAccessToken = async () => {
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: querystring.stringify({
        grant_type: "refresh_token",
        refresh_token,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        `Spotify token error: ${data.error} - ${data.error_description}`
      );
    }
    return data;
  } catch (error) {
    console.error("Error fetching access token", error);

    // Additional detailed logging for production
    if (process.env.NODE_ENV === "production") {
      console.error(`Production Environment Variables:
        SPOTIFY_CLIENT_ID: ${client_id}
        SPOTIFY_CLIENT_SECRET: ${client_secret ? "SET" : "NOT SET"}
        SPOTIFY_REFRESH_TOKEN: ${refresh_token ? "SET" : "NOT SET"}`);
      // console.error(`Response: ${JSON.stringify(response)}`);
    }

    throw error;
  }
};
