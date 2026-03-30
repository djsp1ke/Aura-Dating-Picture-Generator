export interface SpotifyTrack {
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  albumArt: string;
  albumArtSmall: string;
  spotifyUri: string;
  previewUrl: string | null;
  durationMs: number;
}

async function searchViaSpotify(query: string, limit: number): Promise<SpotifyTrack[]> {
  const response = await fetch(`/.netlify/functions/spotify-search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!response.ok) throw new Error('Spotify unavailable');
  return response.json();
}

async function searchViaDeezer(query: string, limit: number): Promise<SpotifyTrack[]> {
  const response = await fetch(`/.netlify/functions/deezer-search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Search failed' }));
    throw new Error(err.error || 'Deezer search failed');
  }
  return response.json();
}

export async function searchSpotify(query: string, limit: number = 8): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];

  // Try Spotify first, fall back to Deezer
  try {
    return await searchViaSpotify(query, limit);
  } catch {
    return searchViaDeezer(query, limit);
  }
}
