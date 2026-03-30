import React, { useState, useEffect, useRef } from 'react';
import { searchSpotify, SpotifyTrack } from '../services/spotifyService';

interface Props {
  onSelect: (track: SpotifyTrack) => void;
  placeholder?: string;
  compact?: boolean;
}

export default function SpotifySearch({ onSelect, placeholder = 'Search for a song...', compact = false }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const tracks = await searchSpotify(query);
        setResults(tracks);
        setShowResults(true);
      } catch (err: any) {
        setError(err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (track: SpotifyTrack) => {
    onSelect(track);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const formatDuration = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className={`w-full pl-9 pr-4 bg-surface-dark border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500 ${compact ? 'py-2 text-sm' : 'py-3'}`}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <span className="w-4 h-4 border-2 border-gray-500 border-t-green-500 rounded-full animate-spin inline-block" />
          </span>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-surface-dark border border-gray-700 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
          {results.map((track) => (
            <button
              key={track.spotifyId}
              onClick={() => handleSelect(track)}
              className="w-full flex items-center gap-3 p-3 hover:bg-surface-light transition-colors text-left border-b border-gray-800 last:border-0"
            >
              {track.albumArtSmall ? (
                <img src={track.albumArtSmall} alt="" className="w-10 h-10 rounded-md flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-gray-700 flex items-center justify-center flex-shrink-0 text-lg">🎵</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{track.title}</div>
                <div className="text-xs text-gray-400 truncate">{track.artist}</div>
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">{formatDuration(track.durationMs)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
