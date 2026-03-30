import React, { useState } from 'react';
import { SongRequest } from '../types';
import SpotifySearch from './SpotifySearch';
import { SpotifyTrack } from '../services/spotifyService';

interface Props {
  onSubmit: (title: string, artist: string, albumArt?: string, spotifyUri?: string) => Promise<void>;
  approvedRequests: SongRequest[];
  error: string | null;
  scenario?: string | null;
}

export default function SongRequestForm({ onSubmit, approvedRequests, error, scenario }: Props) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [albumArt, setAlbumArt] = useState<string | null>(null);
  const [spotifyUri, setSpotifyUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const handleSpotifySelect = (track: SpotifyTrack) => {
    setTitle(track.title);
    setArtist(track.artist);
    setAlbumArt(track.albumArt);
    setSpotifyUri(track.spotifyUri);
  };

  const clearSelection = () => {
    setTitle('');
    setArtist('');
    setAlbumArt(null);
    setSpotifyUri(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim() || submitting) return;
    setSubmitting(true);
    setSuccess(false);
    try {
      await onSubmit(title.trim(), artist.trim(), albumArt || undefined, spotifyUri || undefined);
      clearSelection();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      // Error handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Scenario prompt */}
      {scenario && (
        <div className="bg-gradient-to-r from-primary-500/10 to-pink-500/10 border border-primary-500/30 rounded-2xl p-5 mb-4 text-center slide-up">
          <p className="text-xs text-primary-300 uppercase tracking-wider font-medium mb-2">DJ Says...</p>
          <p className="text-lg font-bold text-white">{scenario}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface-light rounded-2xl p-5 border border-gray-700 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">🎵 Request a Song</h3>
          <button
            type="button"
            onClick={() => { setManualMode(!manualMode); clearSelection(); }}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            {manualMode ? '🔍 Search Spotify' : '✏️ Type manually'}
          </button>
        </div>

        {!manualMode ? (
          <>
            {/* Spotify search */}
            {!title ? (
              <SpotifySearch onSelect={handleSpotifySelect} placeholder="Search Spotify for a song..." />
            ) : (
              /* Selected track preview */
              <div className="flex items-center gap-3 bg-surface-dark rounded-xl p-3 border border-green-500/30">
                {albumArt ? (
                  <img src={albumArt} alt="" className="w-12 h-12 rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0 text-xl">🎵</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{title}</div>
                  <div className="text-sm text-gray-400 truncate">{artist}</div>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-gray-500 hover:text-white text-lg flex-shrink-0 w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            )}
          </>
        ) : (
          /* Manual input */
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Song title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-surface-dark border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              maxLength={100}
            />
            <input
              type="text"
              placeholder="Artist name"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full px-4 py-3 bg-surface-dark border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
              maxLength={100}
            />
          </div>
        )}

        {error && (
          <div className="mt-3 bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-3 bg-green-500/20 border border-green-500/50 rounded-xl p-3 text-green-300 text-sm">
            Song request submitted! The DJ will review it.
          </div>
        )}

        <button
          type="submit"
          disabled={!title.trim() || !artist.trim() || submitting}
          className="w-full mt-4 py-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-bold rounded-xl hover:from-primary-600 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Sending...' : 'Request Song'}
        </button>
      </form>

      {/* Approved songs */}
      {approvedRequests.length > 0 && (
        <div>
          <h3 className="font-bold text-lg mb-3">✅ Approved Requests</h3>
          <div className="space-y-2">
            {approvedRequests.map((req) => (
              <div key={req.id} className="bg-surface-light rounded-xl p-3 flex items-center gap-3">
                {req.album_art ? (
                  <img src={req.album_art} alt="" className="w-10 h-10 rounded-md flex-shrink-0" />
                ) : (
                  <span className="text-xl w-10 h-10 flex items-center justify-center">🎶</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{req.song_title}</div>
                  <div className="text-sm text-gray-400 truncate">{req.artist_name}</div>
                </div>
                {req.status === 'played' && (
                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Played</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
