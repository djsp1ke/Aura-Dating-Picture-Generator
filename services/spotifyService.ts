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

export async function searchSpotify(query: string, limit: number = 8): Promise<SpotifyTrack[]> {
  if (!query.trim()) return [];

  const response = await fetch(`/.netlify/functions/spotify-search?q=${encodeURIComponent(query)}&limit=${limit}`);

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Search failed' }));
    throw new Error(err.error || `Spotify search error: ${response.status}`);
  }

  return response.json();
}
