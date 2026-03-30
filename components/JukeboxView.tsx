import React, { useState, useEffect, useCallback } from 'react';
import { Event, Participant, Game, GameOption, SongRequest } from '../types';
import { submitSongRequest, getSongRequests } from '../services/songRequestService';
import { getJukeboxQueue, voteSong, unvoteSong, getMyVotes } from '../services/jukeboxService';
import { getActiveGame, submitAnswer, getSubmission, createGame, launchGame, endGame, completeGame, getGames } from '../services/gameService';
import { generateQuizQuestions, AIQuizQuestion } from '../services/aiService';
import { getParticipants } from '../services/eventService';
import { supabase } from '../services/supabaseClient';
import SpotifySearch from './SpotifySearch';
import { SpotifyTrack } from '../services/spotifyService';
import QuizQuestion from './QuizQuestion';
import Leaderboard from './Leaderboard';
import MusicPlayer from './MusicPlayer';
import { updateSongRequestStatus } from '../services/songRequestService';

interface Props {
  event: Event;
  participant: Participant;
}

type Tab = 'queue' | 'quiz' | 'request' | 'scores';

export default function JukeboxView({ event, participant }: Props) {
  const [tab, setTab] = useState<Tab>('queue');
  const [queue, setQueue] = useState<(SongRequest & { votes: number })[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Quiz state
  const [activeGame, setActiveGame] = useState<(Game & { options: GameOption[] }) | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ isCorrect: boolean; points: number } | null>(null);
  const [currentPoints, setCurrentPoints] = useState(participant.points);
  const [games, setGames] = useState<Game[]>([]);

  // Host quiz controls
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Request form
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [manualTitle, setManualTitle] = useState('');
  const [manualArtist, setManualArtist] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isHost = participant.nickname === 'Host';

  const loadData = useCallback(async () => {
    const [q, votes, game, parts, gs] = await Promise.all([
      getJukeboxQueue(event.id),
      getMyVotes(participant.id, event.id),
      getActiveGame(event.id),
      getParticipants(event.id),
      getGames(event.id),
    ]);
    setQueue(q);
    setMyVotes(votes);
    setActiveGame(game);
    setParticipants(parts);
    setGames(gs);

    const me = parts.find((p) => p.id === participant.id);
    if (me) setCurrentPoints(me.points);

    if (game) {
      const sub = await getSubmission(game.id, participant.id);
      if (sub) {
        setHasSubmitted(true);
        setSubmissionResult({ isCorrect: sub.is_correct, points: sub.points_awarded });
      } else {
        setHasSubmitted(false);
        setSubmissionResult(null);
      }
    } else {
      setHasSubmitted(false);
      setSubmissionResult(null);
    }
  }, [event.id, participant.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime
  useEffect(() => {
    const channels = [
      supabase.channel('jb-songs').on('postgres_changes', { event: '*', schema: 'public', table: 'song_requests', filter: `event_id=eq.${event.id}` }, () => loadData()).subscribe(),
      supabase.channel('jb-votes').on('postgres_changes', { event: '*', schema: 'public', table: 'song_votes' }, () => loadData()).subscribe(),
      supabase.channel('jb-games').on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `event_id=eq.${event.id}` }, () => loadData()).subscribe(),
      supabase.channel('jb-parts').on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `event_id=eq.${event.id}` }, () => loadData()).subscribe(),
    ];
    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [event.id, loadData]);

  // Auto-switch to quiz tab when a new game becomes active
  useEffect(() => {
    if (activeGame && activeGame.status === 'active' && !hasSubmitted) {
      setTab('quiz');
    }
  }, [activeGame, hasSubmitted]);

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

  const handleAnswer = async (optionId: string, responseMs: number) => {
    if (!activeGame || hasSubmitted) return;
    try {
      const result = await submitAnswer(activeGame.id, participant.id, optionId, responseMs);
      setHasSubmitted(true);
      setSubmissionResult({ isCorrect: result.is_correct, points: result.points_awarded });
      setCurrentPoints((p) => p + result.points_awarded);
    } catch (err: any) {
      if (err.message === 'Already submitted') setHasSubmitted(true);
    }
  };

  // Host: generate and launch a quiz round from queue songs
  const handleGenerateQuiz = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      // Build context from queued + played songs
      const allSongs = [...queue, ...(await getSongRequests(event.id, 'played'))];
      const songContext = allSongs.slice(0, 10).map((s) => `${s.song_title} by ${s.artist_name}`);

      const questions = await generateQuizQuestions({
        mode: songContext.length > 0 ? 'song' : 'template',
        songTitle: songContext.length > 0 ? allSongs[Math.floor(Math.random() * Math.min(allSongs.length, 5))].song_title : undefined,
        artistName: songContext.length > 0 ? allSongs[Math.floor(Math.random() * Math.min(allSongs.length, 5))].artist_name : undefined,
        difficulty: 'medium',
        count: 1,
      });

      if (questions.length === 0) {
        setAiError('No questions generated. Try again.');
        return;
      }

      const q = questions[0];
      const roundNumber = games.length + 1;
      const game = await createGame(event.id, roundNumber, q.question, q.options, event.default_timer_seconds);
      await launchGame(game.id);
      loadData();
    } catch (err: any) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleEndQuiz = async () => {
    if (!activeGame) return;
    if (activeGame.status === 'active') {
      await endGame(activeGame.id);
    } else if (activeGame.status === 'revealing') {
      await completeGame(activeGame.id);
    }
    loadData();
  };

  const handleSubmitSong = async () => {
    const title = manualMode ? manualTitle : selectedTrack?.title;
    const artist = manualMode ? manualArtist : selectedTrack?.artist;
    if (!title?.trim() || !artist?.trim() || submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitSongRequest(event.id, participant.id, title.trim(), artist.trim(), selectedTrack?.albumArt, selectedTrack?.spotifyUri, isHost, selectedTrack?.previewUrl || undefined);
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
              <p className="text-xs text-gray-500">
                {participant.nickname} {isHost && '(Host)'}
                {' · '}<span className="text-primary-400 font-bold">{currentPoints} pts</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">{event.event_code}</span>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full font-medium">Jukebox</span>
          </div>
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
      <div className="flex border-b border-gray-800 max-w-lg mx-auto overflow-x-auto no-scrollbar">
        {([
          ['queue', `🎵 Queue (${queue.length})`],
          ['quiz', `🎮 Quiz${activeGame?.status === 'active' ? ' ●' : ''}`],
          ['request', '➕ Add'],
          ['scores', '🏆 Scores'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors whitespace-nowrap px-1 ${
              tab === t ? 'text-primary-400 border-b-2 border-primary-400' : 'text-gray-500 hover:text-gray-300'
            } ${t === 'quiz' && activeGame?.status === 'active' && !hasSubmitted ? 'text-yellow-400 animate-pulse' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-lg mx-auto p-4">
        {/* QUEUE */}
        {tab === 'queue' && (
          <div>
            {/* Music Player */}
            {queue.some((s) => s.preview_url) && (
              <div className="mb-4">
                <MusicPlayer
                  queue={queue}
                  onSongEnd={isHost ? (song) => updateSongRequestStatus(song.id, 'played').then(loadData) : undefined}
                  compact
                />
              </div>
            )}

            {queue.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">🎶</div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">Queue is empty</h3>
                <p className="text-gray-500 mb-6">Be the first to add a song!</p>
                <button onClick={() => setTab('request')} className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-bold rounded-xl">
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
                        className={`flex flex-col items-center w-12 flex-shrink-0 py-1 rounded-lg transition-colors ${voted ? 'bg-primary-500/20 text-primary-400' : 'bg-gray-800 text-gray-500 hover:text-white'}`}
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
                      </div>
                      {i === 0 && <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-1 rounded-full font-medium flex-shrink-0">Up Next</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* QUIZ */}
        {tab === 'quiz' && (
          <div>
            {activeGame && activeGame.status === 'active' && !hasSubmitted ? (
              <QuizQuestion game={activeGame} options={activeGame.options} onAnswer={handleAnswer} />
            ) : activeGame && hasSubmitted ? (
              <div className="text-center py-12 slide-up">
                <div className="text-5xl mb-4">{submissionResult?.isCorrect ? '✅' : '❌'}</div>
                <h3 className="text-2xl font-bold mb-2">{submissionResult?.isCorrect ? 'Correct!' : 'Not quite!'}</h3>
                <p className="text-gray-400 mb-4">+{submissionResult?.points || 0} points</p>
                {activeGame.status === 'revealing' && <p className="text-primary-300 text-sm">Results are in!</p>}
                {isHost && activeGame.status === 'revealing' && (
                  <button onClick={handleEndQuiz} className="mt-4 px-6 py-2 bg-gray-700 text-white rounded-xl text-sm font-medium">
                    Complete Round
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎮</div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">Music Trivia</h3>
                <p className="text-gray-500 mb-6">
                  {isHost ? 'Launch a quiz round based on the songs in the queue!' : 'Waiting for the host to launch a quiz round...'}
                </p>

                {isHost && (
                  <div className="space-y-3">
                    <button
                      onClick={handleGenerateQuiz}
                      disabled={aiLoading}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                    >
                      {aiLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Generating...
                        </span>
                      ) : (
                        '🤖 Launch Quiz Round'
                      )}
                    </button>
                    {aiError && (
                      <p className="text-red-400 text-sm">{aiError}</p>
                    )}
                    <p className="text-xs text-gray-600">
                      {games.length} round{games.length !== 1 ? 's' : ''} played
                    </p>
                  </div>
                )}

                {!isHost && (
                  <div className="flex justify-center mt-4">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce mx-1" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce mx-1" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce mx-1" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            )}

            {/* Host controls during active game */}
            {isHost && activeGame?.status === 'active' && (
              <div className="mt-4 text-center">
                <button onClick={handleEndQuiz} className="px-6 py-2 bg-yellow-500 text-black rounded-xl text-sm font-bold">
                  End & Score
                </button>
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
                onClick={handleSubmitSong}
                disabled={manualMode ? (!manualTitle.trim() || !manualArtist.trim()) : !selectedTrack}
                className="w-full mt-4 py-3 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Adding...' : 'Add to Queue'}
              </button>
            </div>
          </div>
        )}

        {/* SCORES */}
        {tab === 'scores' && (
          <Leaderboard participants={participants} currentParticipantId={participant.id} eventId={event.id} />
        )}
      </div>
    </div>
  );
}
