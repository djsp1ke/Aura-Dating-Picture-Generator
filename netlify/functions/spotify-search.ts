const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';

let cachedToken: { token: string; expires: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires) {
    return cachedToken.token;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = {
    token: data.access_token,
    expires: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Spotify credentials not configured' }) };
  }

  const query = event.queryStringParameters?.q;
  const limit = event.queryStringParameters?.limit || '10';

  if (!query) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing search query (q)' }) };
  }

  try {
    const token = await getAccessToken();

    const searchUrl = `https://api.spotify.com/v1/search?type=track&limit=${limit}&q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: 502, body: JSON.stringify({ error: `Spotify API error (${response.status}): ${errText}` }) };
    }

    const data = await response.json();
    const tracks = (data.tracks?.items || []).map((track: any) => ({
      spotifyId: track.id,
      title: track.name,
      artist: track.artists.map((a: any) => a.name).join(', '),
      album: track.album?.name || '',
      albumArt: track.album?.images?.[0]?.url || '',
      albumArtSmall: track.album?.images?.[2]?.url || track.album?.images?.[0]?.url || '',
      spotifyUri: track.uri,
      previewUrl: track.preview_url || null,
      durationMs: track.duration_ms,
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tracks),
    };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
