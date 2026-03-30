import React, { useState, useEffect, useCallback } from 'react';
import { Event, Participant, SongRequest } from '../types';
import { submitSongRequest, getSongRequests } from '../services/songRequestService';
import { getJukeboxQueue, voteSong, unvoteSong, getMyVotes } from '../services/jukeboxService';
import { supabase } from '../services/supabaseClient';
import SpotifySearch from './SpotifySearch';
import { SpotifyTrack } from '../services/spotifyService';

interface Props {
  event: Event;
  participant: Participant;
}

type Tab = 'queue' | 'request' | 'history';

export default function JukeboxView({ event, participant }: Props) {
  const [tab, setTab] = useState<Tab>('queue');
  const [queue, setQueue] = useState<(SongRequest & { votes: number })[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [playedSongs, setPlayedSongs] = useState<SongRequest[]>([]);

  // Request form
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [q, votes, played] = await Promise.all([
      getJukeboxQueue(event.id),
      getMyVotes(participant.id, event.id),
      getSongRequests(event.id, 'played'),
    ]);
    setQueue(q);
    setMyVotes(votes);
    setPlayedSongs(played);
  }, [event.id, participant.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime
  useEffect(() => {
    const channels = [
      supabase
        .channel('jukebox-songs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'song_requests', filter: `event_id=eq.${event.id}` }, () => loadData())
        .subscribe(),
      supabase
        .channel('jukebox-votes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'song_votes' }, () => loadData())
        .subscribe(),
    ];
    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [event.id, loadData]);

  const handleVote = async (songId: string) => {
    if (myVotes.has(songId)) {
      await unvoteSong(songId, participant.id);
      setMyVotes((prev) => { const n = new Set(prev); n.delete(songId); return n; });
    } else {
      await voteSong(songId, participant.id);
      setMyVotes((prev) => new Set(prev).add(songId));
    }
    loadData();
  };

  const handleSubmit = async () => {
    const title = manualMode ? manualTitle : selectedTrack?.title;
    const artist = manualMode ? manualArtist : selectedTrack?.artist;
    if (!title?.trim() || !artist?.trim() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const isHost = participant.nickname === 'Host';
      await submitSongRequest(
        event.id,
        participant.id,
        title.trim(),
        artist.trim(),
        selectedTrack?.albumArt,
        selectedTrack?.spotifyUri,
        isHost
      );
      setSelectedTrack(null);
      setManualTitle('');
      setManualArtist('');
      setSubmitSuccess(true);
      setTab('queue');
      setTimeout(() => setSubmitSuccess(false), 3000);
      loadData();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const nowPlaying = event.current_song_title ? {
    title: event.current_song_title,
    artist: event.current_song_artist,
    albumArt: event.current_song_album_art,
  } : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-dark via-surface to-surface-dark">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-dark/90 backdrop-blur-md border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎶</span>
            <div>
              <h1 className="font-bold text-sm">{event.name}</h1>
              <p className="text-xs text-gray-500">{participant.nickname}</p>
            </div>
          </div>
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium">Jukebox</span>
        </div>
      </div>

      {/* Now Playing */}
      {nowPlaying && (
        <div className="bg-gradient-to-r from-primary-500/10 to-pink-500/10 border-b border-primary-500/20 px-4 py-3">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            {nowPlaying.albumArt ? (
              <img src={nowPlaying.albumArt} alt="" className="w-12 h-12 rounded-lg" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center text-xl">🎵</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary-300 uppercase tracking-wider">Now Playing</p>
              <p className="font-bold truncate">{nowPlaying.title}</p>
              <p className="text-sm text-gray-400 truncate">{nowPlaying.artist}</p>
            </div>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div className="bg-green-500/10 border-b border-green-500/30 px-4 py-2 text-center">
          <span className="text-green-300 text-sm">Song added to the queue!</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800 max-w-lg mx-auto">
        {([['queue', `🎵 Queue (${queue.length})`], ['request', '➕ Add Song'], ['history', '📜 History']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === t ? 'text-primary-400 border-b-2 border-primary-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* QUEUE */}
        {tab === 'queue' && (
          <div>
            {queue.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🎶</div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">Queue is empty</h3>
                <p className="text-gray-500 mb-6">Be the first to add a song!</p>
                <button
                  onClick={() => setTab('request')}
                  className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-bold rounded-xl"
                >
                  ➕ Add a Song
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((song, i) => {
                  const voted = myVotes.has(song.id);
                  return (
                    <div key={song.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${i === 0 ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-surface-light'}`}>
                      <button
                        onClick={() => handleVote(song.id)}
                        className={`flex flex-col items-center w-12 flex-shrink-0 py-1 rounded-lg transition-colors ${
                          voted ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-800 text-gray-500 hover:text-white'
                        }`}
                      >
                        <span className="text-xs">▲</span>
                        <span className="text-sm font-bold">{song.votes}</span>
                      </button>
                      {song.album_art ? (
                        <img src={song.album_art} alt="" className="w-10 h-10 rounded-md flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-gray-700 flex items-center justify-center flex-shrink-0">🎵</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{song.song_title}</div>
                        <div className="text-xs text-gray-400 truncate">{song.artist_name}</div>
                        <div className="text-xs text-gray-600">{(song.participant as any)?.nickname}</div>
                      </div>
                      {i === 0 && <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded-full font-medium flex-shrink-0">Up Next</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* REQUEST */}
        {tab === 'request' && (
          <div className="space-y-4">
            <div className="bg-surface-light rounded-2xl p-5 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Add a Song</h3>
                <button
                  type="button"
                  onClick={() => { setManualMode(!manualMode); setSelectedTrack(null); setManualTitle(''); setManualArtist(''); }}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  {manualMode ? '🔍 Search' : '✏️ Type manually'}
                </button>
              </div>

              {!manualMode ? (
                <>
                  {!selectedTrack ? (
                    <SpotifySearch onSelect={setSelectedTrack} placeholder="Search for a song..." />
                  ) : (
                    <div className="flex items-center gap-3 bg-surface-dark rounded-xl p-3 border border-green-500/30">
                      {selectedTrack.albumArt ? (
                        <img src={selectedTrack.albumArt} alt="" className="w-12 h-12 rounded-lg flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center text-xl">🎵</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{selectedTrack.title}</div>
                        <div className="text-sm text-gray-400 truncate">{selectedTrack.artist}</div>
                      </div>
                      <button onClick={() => setSelectedTrack(null)} className="text-gray-500 hover:text-white text-lg">✕</button>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <input type="text" placeholder="Song title" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-dark border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500" maxLength={100} />
                  <input type="text" placeholder="Artist name" value={manualArtist} onChange={(e) => setManualArtist(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-dark border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500" maxLength={100} />
                </div>
              )}

              {submitError && (
                <div className="mt-3 bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-300 text-sm">{submitError}</div>
              )}

              <button
                onClick={handleSubmit}
                disabled={manualMode ? (!manualTitle.trim() || !manualArtist.trim()) : !selectedTrack}
                className="w-full mt-4 py-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding...' : 'Add to Queue'}
              </button>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div>
            {playedSongs.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No songs played yet</p>
            ) : (
              <div className="space-y-2">
                {playedSongs.map((song) => (
                  <div key={song.id} className="flex items-center gap-3 bg-surface-light rounded-xl p-3 opacity-70">
                    {song.album_art ? (
                      <img src={song.album_art} alt="" className="w-10 h-10 rounded-md flex-shrink-0" />
                    ) : (
                      <span className="text-xl w-10 h-10 flex items-center justify-center">🎶</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{song.song_title}</div>
                      <div className="text-xs text-gray-400 truncate">{song.artist_name}</div>
                    </div>
                    <span className="text-xs text-gray-600">✓ Played</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
