import React, { useState, useEffect, useCallback } from 'react';
import { Event, Participant, Game, GameOption, SongRequest, Announcement } from '../types';
import { updateEventStatus, getParticipants, getTeamScores, sendAnnouncement, getAnnouncements } from '../services/eventService';
import { createGame, launchGame, endGame, completeGame, getGames } from '../services/gameService';
import { getSongRequests, updateSongRequestStatus } from '../services/songRequestService';
import { supabase } from '../services/supabaseClient';
import { QUIZ_TIME_LIMIT_SECONDS } from '../constants';

interface Props {
  event: Event;
  onEventUpdate: (event: Event) => void;
}

type DJTab = 'overview' | 'quiz' | 'songs' | 'announce';

export default function DJView({ event, onEventUpdate }: Props) {
  const [tab, setTab] = useState<DJTab>('overview');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [songRequests, setSongRequests] = useState<SongRequest[]>([]);
  const [teamScores, setTeamScores] = useState<{ team: any; score: number }[]>([]);

  // Quiz creation
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
  ]);

  // Announcements
  const [announcementText, setAnnouncementText] = useState('');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_submissions', filter: undefined }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'song_requests', filter: `event_id=eq.${event.id}` }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [event.id, loadData]);

  const handleEventToggle = async () => {
    const newStatus = event.status === 'active' ? 'ended' : 'active';
    await updateEventStatus(event.id, newStatus);
    onEventUpdate({ ...event, status: newStatus });
  };

  const handleCreateGame = async () => {
    if (!questionText.trim() || options.filter((o) => o.text.trim()).length < 2) return;
    if (!options.some((o) => o.isCorrect)) return;

    const roundNumber = games.length + 1;
    await createGame(
      event.id,
      roundNumber,
      questionText,
      options.filter((o) => o.text.trim()),
      QUIZ_TIME_LIMIT_SECONDS
    );
    setQuestionText('');
    setOptions([
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
    ]);
    loadData();
  };

  const handleLaunchGame = async (gameId: string) => {
    await launchGame(gameId);
    loadData();
  };

  const handleEndGame = async (gameId: string) => {
    await endGame(gameId);
    loadData();
  };

  const handleCompleteGame = async (gameId: string) => {
    await completeGame(gameId);
    loadData();
  };

  const handleSongAction = async (requestId: string, status: SongRequest['status']) => {
    await updateSongRequestStatus(requestId, status);
    loadData();
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
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              🎧 <span>{event.name}</span>
            </h1>
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
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 max-w-2xl mx-auto">
        {([['overview', '📊 Overview'], ['quiz', '❓ Quiz'], ['songs', `🎵 Songs${pendingSongs.length > 0 ? ` (${pendingSongs.length})` : ''}`], ['announce', '📢 Announce']] as [DJTab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
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
            {/* Team scores */}
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

            {/* Player list */}
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

            {/* Active game */}
            {activeGame && (
              <div className="bg-primary-500/10 border border-primary-500/30 rounded-xl p-4">
                <div className="font-bold text-primary-400">Active: Round {activeGame.round_number}</div>
                <p className="text-sm text-gray-300 mt-1">{activeGame.question_text}</p>
              </div>
            )}
          </div>
        )}

        {/* QUIZ */}
        {tab === 'quiz' && (
          <div className="space-y-6">
            {/* Create question */}
            <div className="bg-surface-light rounded-2xl p-5 border border-gray-700">
              <h3 className="font-bold text-lg mb-4">Create Question</h3>
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

              <p className="text-xs text-gray-500 mb-3">Click a letter to mark the correct answer (green = correct)</p>

              <button
                onClick={handleCreateGame}
                disabled={!questionText.trim() || options.filter((o) => o.text.trim()).length < 2}
                className="w-full py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Question
              </button>
            </div>

            {/* Game list */}
            <div>
              <h3 className="font-bold mb-3">Rounds</h3>
              <div className="space-y-3">
                {games.map((g) => (
                  <div key={g.id} className="bg-surface-light rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">Round {g.round_number}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        g.status === 'pending' ? 'bg-gray-600 text-gray-300' :
                        g.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        g.status === 'revealing' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {g.status}
                      </span>
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

        {/* ANNOUNCE */}
        {tab === 'announce' && (
          <div className="space-y-6">
            <div className="bg-surface-light rounded-2xl p-5 border border-gray-700">
              <h3 className="font-bold text-lg mb-4">📢 Send Announcement</h3>
              <textarea
                placeholder="Type your announcement..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full px-4 py-3 bg-surface-dark border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 resize-none h-24"
              />
              <button
                onClick={handleAnnounce}
                disabled={!announcementText.trim()}
                className="w-full mt-3 py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                Send to All
              </button>
            </div>

            <div>
              <h3 className="font-bold mb-3">Recent Announcements</h3>
              <div className="space-y-2">
                {announcements.map((a) => (
                  <div key={a.id} className="bg-surface-light rounded-xl p-3 border border-gray-700">
                    <p className="text-sm">{a.message}</p>
                    {a.created_at && (
                      <p className="text-xs text-gray-500 mt-1">{new Date(a.created_at).toLocaleTimeString()}</p>
                    )}
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
