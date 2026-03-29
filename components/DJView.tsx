import React, { useState, useEffect, useCallback } from 'react';
import { Event, Participant, Game, GameOption, SongRequest, Announcement } from '../types';
import { updateEventStatus, updateEvent, getParticipants, getTeamScores, sendAnnouncement, getAnnouncements } from '../services/eventService';
import { createGame, launchGame, endGame, completeGame, getGames } from '../services/gameService';
import { getSongRequests, updateSongRequestStatus } from '../services/songRequestService';
import { generateQuizQuestions, AIQuizQuestion, GENRES, ERAS, QuizGenerationSettings } from '../services/aiService';
import { supabase } from '../services/supabaseClient';

interface Props {
  event: Event;
  onEventUpdate: (event: Event) => void;
}

type DJTab = 'overview' | 'quiz' | 'songs' | 'settings';

export default function DJView({ event, onEventUpdate }: Props) {
  const [tab, setTab] = useState<DJTab>('overview');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [songRequests, setSongRequests] = useState<SongRequest[]>([]);
  const [teamScores, setTeamScores] = useState<{ team: any; score: number }[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Manual quiz creation
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ]);

  // AI generation
  const [aiMode, setAiMode] = useState<'song' | 'template'>('song');
  const [aiGenre, setAiGenre] = useState('');
  const [aiEra, setAiEra] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [aiCount, setAiCount] = useState(3);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState<AIQuizQuestion[]>([]);

  // Now playing
  const [currentSong, setCurrentSong] = useState(event.current_song_title || '');
  const [currentArtist, setCurrentArtist] = useState(event.current_song_artist || '');

  // Timer & settings
  const [timerSeconds, setTimerSeconds] = useState(event.default_timer_seconds || 15);
  const [scenario, setScenario] = useState(event.song_request_scenario || '');

  // Announcements
  const [announcementText, setAnnouncementText] = useState('');

  // Quiz creation mode
  const [quizMode, setQuizMode] = useState<'manual' | 'ai'>('ai');

  const loadData = useCallback(async () => {
    const [parts, gs, songs, scores, anns] = await Promise.all([
      getParticipants(event.id),
      getGames(event.id),
      getSongRequests(event.id),
      getTeamScores(event.id),
      getAnnouncements(event.id),
    ]);
    setParticipants(parts);
    setGames(gs);
    setSongRequests(songs);
    setTeamScores(scores);
    setAnnouncements(anns);
  }, [event.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel('dj-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `event_id=eq.${event.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_submissions' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'song_requests', filter: `event_id=eq.${event.id}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [event.id, loadData]);

  const handleEventToggle = async () => {
    const newStatus = event.status === 'active' ? 'ended' : 'active';
    await updateEventStatus(event.id, newStatus);
    onEventUpdate({ ...event, status: newStatus });
  };

  // --- Now Playing ---
  const handleUpdateNowPlaying = async () => {
    const updated = await updateEvent(event.id, {
      current_song_title: currentSong || null,
      current_song_artist: currentArtist || null,
    });
    onEventUpdate(updated);
  };

  // --- AI Generation ---
  const handleAIGenerate = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiGenerated([]);
    try {
      const settings: QuizGenerationSettings = {
        mode: aiMode,
        difficulty: aiDifficulty,
        count: aiCount,
        songTitle: aiMode === 'song' ? (currentSong || undefined) : undefined,
        artistName: aiMode === 'song' ? (currentArtist || undefined) : undefined,
        genre: aiMode === 'template' ? (aiGenre || undefined) : undefined,
        era: aiMode === 'template' ? (aiEra || undefined) : undefined,
      };
      const questions = await generateQuizQuestions(settings);
      setAiGenerated(questions);
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate questions');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddAIQuestion = async (q: AIQuizQuestion) => {
    const roundNumber = games.length + 1;
    await createGame(event.id, roundNumber, q.question, q.options, timerSeconds);
    setAiGenerated((prev) => prev.filter((x) => x !== q));
    loadData();
  };

  const handleAddAllAIQuestions = async () => {
    for (let i = 0; i < aiGenerated.length; i++) {
      const roundNumber = games.length + 1 + i;
      await createGame(event.id, roundNumber, aiGenerated[i].question, aiGenerated[i].options, timerSeconds);
    }
    setAiGenerated([]);
    loadData();
  };

  // --- Manual Question ---
  const handleCreateGame = async () => {
    if (!questionText.trim() || options.filter((o) => o.text.trim()).length < 2) return;
    if (!options.some((o) => o.isCorrect)) return;
    const roundNumber = games.length + 1;
    await createGame(event.id, roundNumber, questionText, options.filter((o) => o.text.trim()), timerSeconds);
    setQuestionText('');
    setOptions([
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ]);
    loadData();
  };

  const handleLaunchGame = async (gameId: string) => { await launchGame(gameId); loadData(); };
  const handleEndGame = async (gameId: string) => { await endGame(gameId); loadData(); };
  const handleCompleteGame = async (gameId: string) => { await completeGame(gameId); loadData(); };

  const handleSongAction = async (requestId: string, status: SongRequest['status']) => {
    await updateSongRequestStatus(requestId, status);
    loadData();
  };

  const handleSaveSettings = async () => {
    const updated = await updateEvent(event.id, {
      default_timer_seconds: timerSeconds,
      song_request_scenario: scenario || null,
    });
    onEventUpdate(updated);
  };

  const handleAnnounce = async () => {
    if (!announcementText.trim()) return;
    await sendAnnouncement(event.id, announcementText);
    setAnnouncementText('');
    loadData();
  };

  const pendingSongs = songRequests.filter((s) => s.status === 'pending');
  const activeGame = games.find((g) => g.status === 'active' || g.status === 'revealing');

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-dark via-surface to-surface-dark">
      {/* DJ Header */}
      <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">🎧 {event.name}</h1>
              <p className="text-sm text-gray-400">
                Code: <span className="font-mono text-yellow-400 font-bold">{event.event_code}</span>
                {' · '}{participants.length} players
              </p>
            </div>
            <button
              onClick={handleEventToggle}
              className={`px-4 py-2 rounded-xl font-bold text-sm ${
                event.status === 'active'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                  : 'bg-green-500/20 text-green-400 border border-green-500/50'
              }`}
            >
              {event.status === 'active' ? 'End Event' : 'Start Event'}
            </button>
          </div>

          {/* Now Playing bar */}
          <div className="bg-surface-dark/60 rounded-xl p-3 flex items-center gap-2">
            <span className="text-lg">🎵</span>
            <input
              type="text"
              placeholder="Song title"
              value={currentSong}
              onChange={(e) => setCurrentSong(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-surface-light border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
            <input
              type="text"
              placeholder="Artist"
              value={currentArtist}
              onChange={(e) => setCurrentArtist(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-surface-light border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500"
            />
            <button
              onClick={handleUpdateNowPlaying}
              className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm font-medium hover:bg-yellow-500/30 flex-shrink-0"
            >
              Set
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 max-w-2xl mx-auto overflow-x-auto no-scrollbar">
        {([
          ['overview', '📊 Overview'],
          ['quiz', '❓ Quiz'],
          ['songs', `🎵 Songs${pendingSongs.length > 0 ? ` (${pendingSongs.length})` : ''}`],
          ['settings', '⚙️ Settings'],
        ] as [DJTab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors whitespace-nowrap px-2 ${
              tab === t ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {teamScores.map((ts) => {
                const isMonts = ts.team.name === 'Montagues';
                const color = isMonts ? 'red' : 'blue';
                return (
                  <div key={ts.team.id} className={`bg-${color}-500/10 border border-${color}-500/30 rounded-xl p-4 text-center`}>
                    <div className="text-2xl">{ts.team.icon}</div>
                    <div className={`font-bold text-${color}-400`}>{ts.team.name}</div>
                    <div className="text-3xl font-black mt-1">{ts.score}</div>
                  </div>
                );
              })}
            </div>

            {activeGame && (
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
                <div className="font-bold text-primary-400">Active: Round {activeGame.round_number}</div>
                <p className="text-sm text-gray-300 mt-1">{activeGame.question_text}</p>
              </div>
            )}

            <div>
              <h3 className="font-bold mb-3">Players ({participants.length})</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {participants.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 bg-surface-light rounded-lg p-2 text-sm">
                    <span className="text-gray-500 w-6 text-right">#{i + 1}</span>
                    <span>{p.team?.icon}</span>
                    <span className="flex-1 font-medium">{p.nickname}</span>
                    <span className="font-bold">{p.points} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick announce */}
            <div className="bg-surface-light rounded-xl p-4 border border-gray-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Quick announcement..."
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface-dark border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleAnnounce()}
                />
                <button
                  onClick={handleAnnounce}
                  disabled={!announcementText.trim()}
                  className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg text-sm hover:bg-yellow-400 disabled:opacity-50"
                >
                  📢 Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QUIZ */}
        {tab === 'quiz' && (
          <div className="space-y-6">
            {/* Mode toggle */}
            <div className="flex bg-surface-light rounded-xl p-1">
              <button
                onClick={() => setQuizMode('ai')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  quizMode === 'ai' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400'
                }`}
              >
                🤖 AI Generate
              </button>
              <button
                onClick={() => setQuizMode('manual')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  quizMode === 'manual' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400'
                }`}
              >
                ✏️ Manual
              </button>
            </div>

            {quizMode === 'ai' ? (
              <div className="bg-surface-light rounded-2xl p-5 border border-gray-700">
                <h3 className="font-bold text-lg mb-4">🤖 AI Question Generator</h3>

                {/* AI mode toggle */}
                <div className="flex bg-surface-dark rounded-lg p-1 mb-4">
                  <button
                    onClick={() => setAiMode('song')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium ${
                      aiMode === 'song' ? 'bg-primary-500/20 text-primary-400' : 'text-gray-500'
                    }`}
                  >
                    🎵 Based on Song
                  </button>
                  <button
                    onClick={() => setAiMode('template')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium ${
                      aiMode === 'template' ? 'bg-primary-500/20 text-primary-400' : 'text-gray-500'
                    }`}
                  >
                    🎲 Template
                  </button>
                </div>

                {aiMode === 'song' ? (
                  <div className="bg-surface-dark rounded-xl p-3 mb-4">
                    <p className="text-xs text-gray-400 mb-2">Generating questions about the currently playing song:</p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🎵</span>
                      <span className="font-medium">
                        {currentSong && currentArtist
                          ? `${currentSong} — ${currentArtist}`
                          : <span className="text-gray-500">Set a song in the Now Playing bar above</span>}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Genre</label>
                        <select
                          value={aiGenre}
                          onChange={(e) => setAiGenre(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-dark border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                        >
                          <option value="">Any genre</option>
                          {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Era</label>
                        <select
                          value={aiEra}
                          onChange={(e) => setAiEra(e.target.value)}
                          className="w-full px-3 py-2 bg-surface-dark border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                        >
                          <option value="">Any era</option>
                          {ERAS.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shared settings */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Difficulty</label>
                    <select
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value as any)}
                      className="w-full px-3 py-2 bg-surface-dark border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Questions</label>
                    <select
                      value={aiCount}
                      onChange={(e) => setAiCount(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-surface-dark border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-yellow-500"
                    >
                      {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>

                {aiError && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-300 text-sm mb-4">
                    {aiError}
                  </div>
                )}

                <button
                  onClick={handleAIGenerate}
                  disabled={aiLoading || (aiMode === 'song' && (!currentSong || !currentArtist))}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {aiLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </span>
                  ) : (
                    '🤖 Generate Questions'
                  )}
                </button>

                {/* Generated questions preview */}
                {aiGenerated.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm text-gray-300">Generated ({aiGenerated.length})</h4>
                      <button
                        onClick={handleAddAllAIQuestions}
                        className="text-xs px-3 py-1 bg-green-500/20 text-green-400 rounded-full hover:bg-green-500/30 font-medium"
                      >
                        Add All
                      </button>
                    </div>
                    <div className="space-y-3">
                      {aiGenerated.map((q, i) => (
                        <div key={i} className="bg-surface-dark rounded-xl p-3 border border-gray-700">
                          <p className="font-medium text-sm mb-2">{q.question}</p>
                          <div className="grid grid-cols-2 gap-1 mb-2">
                            {q.options.map((o, j) => (
                              <span key={j} className={`text-xs px-2 py-1 rounded ${o.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                                {String.fromCharCode(65 + j)}. {o.text}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => handleAddAIQuestion(q)}
                            className="text-xs px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 font-medium"
                          >
                            + Add to Queue
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* MANUAL Question Creation */
              <div className="bg-surface-light rounded-2xl p-5 border border-gray-700">
                <h3 className="font-bold text-lg mb-4">✏️ Create Question</h3>
                <input
                  type="text"
                  placeholder="Question text..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-dark border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 mb-4"
                />
                <div className="space-y-2 mb-4">
                  {options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        onClick={() => setOptions(options.map((o, j) => ({ ...o, isCorrect: j === i })))}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          opt.isCorrect ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {opt.isCorrect ? '✓' : String.fromCharCode(65 + i)}
                      </button>
                      <input
                        type="text"
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        value={opt.text}
                        onChange={(e) => setOptions(options.map((o, j) => j === i ? { ...o, text: e.target.value } : o))}
                        className="flex-1 px-3 py-2 bg-surface-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mb-3">Click a letter to mark the correct answer</p>
                <button
                  onClick={handleCreateGame}
                  disabled={!questionText.trim() || options.filter((o) => o.text.trim()).length < 2}
                  className="w-full py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Question
                </button>
              </div>
            )}

            {/* Game list */}
            <div>
              <h3 className="font-bold mb-3">Rounds ({games.length})</h3>
              <div className="space-y-3">
                {games.map((g) => (
                  <div key={g.id} className="bg-surface-light rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">Round {g.round_number}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{g.time_limit_seconds}s</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          g.status === 'pending' ? 'bg-gray-600 text-gray-300' :
                          g.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          g.status === 'revealing' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {g.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">{g.question_text}</p>
                    <div className="flex gap-2">
                      {g.status === 'pending' && (
                        <button onClick={() => handleLaunchGame(g.id)} className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg text-sm hover:bg-green-400">
                          Launch
                        </button>
                      )}
                      {g.status === 'active' && (
                        <button onClick={() => handleEndGame(g.id)} className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-lg text-sm hover:bg-yellow-400">
                          End & Score
                        </button>
                      )}
                      {g.status === 'revealing' && (
                        <button onClick={() => handleCompleteGame(g.id)} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-lg text-sm hover:bg-gray-500">
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {games.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No questions created yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SONGS */}
        {tab === 'songs' && (
          <div className="space-y-6">
            {/* Active scenario */}
            {event.song_request_scenario && (
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">Active Scenario</p>
                <p className="font-medium text-primary-300">{event.song_request_scenario}</p>
              </div>
            )}

            {/* Pending */}
            <div>
              <h3 className="font-bold mb-3">Pending Requests ({pendingSongs.length})</h3>
              <div className="space-y-2">
                {pendingSongs.map((req) => (
                  <div key={req.id} className="bg-surface-light rounded-xl p-4 border border-gray-700 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{req.song_title}</div>
                      <div className="text-sm text-gray-400 truncate">{req.artist_name}</div>
                      <div className="text-xs text-gray-500">{(req.participant as any)?.nickname || 'Guest'}</div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleSongAction(req.id, 'approved')}
                        className="w-10 h-10 bg-green-500/20 text-green-400 rounded-lg flex items-center justify-center hover:bg-green-500/30 text-lg"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => handleSongAction(req.id, 'rejected')}
                        className="w-10 h-10 bg-red-500/20 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500/30 text-lg"
                      >
                        ✗
                      </button>
                    </div>
                  </div>
                ))}
                {pendingSongs.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No pending requests</p>
                )}
              </div>
            </div>

            {/* Approved */}
            <div>
              <h3 className="font-bold mb-3">Approved</h3>
              <div className="space-y-2">
                {songRequests.filter((s) => s.status === 'approved').map((req) => (
                  <div key={req.id} className="bg-green-500/10 rounded-xl p-3 flex items-center gap-3 border border-green-500/20">
                    <span className="text-lg">🎶</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{req.song_title}</span>
                      <span className="text-gray-400"> — {req.artist_name}</span>
                    </div>
                    <button
                      onClick={() => handleSongAction(req.id, 'played')}
                      className="text-xs bg-surface-light px-3 py-1 rounded-full hover:bg-gray-700"
                    >
                      Mark Played
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS */}
        {tab === 'settings' && (
          <div className="space-y-6">
            {/* Timer */}
            <div className="bg-surface-light rounded-2xl p-5 border border-gray-700">
              <h3 className="font-bold text-lg mb-4">⏱️ Quiz Timer</h3>
              <div className="flex items-center gap-4 mb-2">
                <input
                  type="range"
                  min={5}
                  max={60}
                  step={5}
                  value={timerSeconds}
                  onChange={(e) => setTimerSeconds(Number(e.target.value))}
                  className="flex-1 accent-yellow-500"
                />
                <span className="text-2xl font-bold text-yellow-400 w-16 text-right">{timerSeconds}s</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>5s (Speed)</span>
                <span>30s (Standard)</span>
                <span>60s (Relaxed)</span>
              </div>
            </div>

            {/* Song Request Scenario */}
            <div className="bg-surface-light rounded-2xl p-5 border border-gray-700">
              <h3 className="font-bold text-lg mb-2">🎤 Song Request Scenario</h3>
              <p className="text-sm text-gray-400 mb-4">Set a theme or prompt that guests will see when requesting songs</p>
              <textarea
                placeholder='e.g. "Request a song that reminds you of summer" or "What was your first slow dance song?"'
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full px-4 py-3 bg-surface-dark border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 resize-none h-20 text-sm"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveSettings}
                  className="flex-1 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
                >
                  Save Settings
                </button>
                {scenario && (
                  <button
                    onClick={() => { setScenario(''); updateEvent(event.id, { song_request_scenario: null }).then(onEventUpdate); }}
                    className="px-4 py-3 bg-red-500/20 text-red-400 font-bold rounded-xl hover:bg-red-500/30"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Quick scenarios */}
            <div>
              <h3 className="font-bold mb-3">Quick Scenarios</h3>
              <div className="grid grid-cols-1 gap-2">
                {[
                  'Request a song that reminds you of summer',
                  'What was the first song you fell in love with?',
                  'Request your guilty pleasure song',
                  'What song gets you on the dance floor every time?',
                  'Request a song from the year you were born',
                  'What song would be your walk-on anthem?',
                  'Request a song that tells a story',
                  'What song would you sing at karaoke?',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScenario(s)}
                    className="text-left px-4 py-3 bg-surface-light rounded-xl border border-gray-700 text-sm text-gray-300 hover:border-yellow-500/50 hover:text-white transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent announcements */}
            <div>
              <h3 className="font-bold mb-3">Recent Announcements</h3>
              <div className="space-y-2">
                {announcements.map((a) => (
                  <div key={a.id} className="bg-surface-light rounded-xl p-3 border border-gray-700">
                    <p className="text-sm">{a.message}</p>
                    {a.created_at && <p className="text-xs text-gray-500 mt-1">{new Date(a.created_at).toLocaleTimeString()}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
