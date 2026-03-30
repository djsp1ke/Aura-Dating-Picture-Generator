// Deezer API is public — no authentication required
const DEEZER_API = 'https://api.deezer.com';

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const query = event.queryStringParameters?.q;
  const limit = event.queryStringParameters?.limit || '10';

  if (!query) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing search query (q)' }) };
  }

  try {
    const response = await fetch(
      `${DEEZER_API}/search?q=${encodeURIComponent(query)}&limit=${limit}`
    );

    if (!response.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: `Deezer API error: ${response.status}` }) };
    }

    const data = await response.json();

    if (data.error) {
      return { statusCode: 502, body: JSON.stringify({ error: data.error.message || 'Deezer error' }) };
    }

    const tracks = (data.data || []).map((track: any) => ({
      spotifyId: `deezer-${track.id}`,
      title: track.title,
      artist: track.artist?.name || '',
      album: track.album?.title || '',
      albumArt: track.album?.cover_big || track.album?.cover_medium || '',
      albumArtSmall: track.album?.cover_small || track.album?.cover_medium || '',
      spotifyUri: track.link || '',
      previewUrl: track.preview || null,
      durationMs: (track.duration || 0) * 1000,
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
