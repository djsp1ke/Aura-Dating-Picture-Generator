import React, { useState, useEffect, useCallback } from 'react';
import { Event, Participant, Game, GameOption, Team, SongRequest, Announcement } from '../types';
import { getParticipants, getTeamScores, getAnnouncements, getEventByCode } from '../services/eventService';
import { getActiveGame } from '../services/gameService';
import { getSongRequests, updateSongRequestStatus } from '../services/songRequestService';
import { getJukeboxQueue } from '../services/jukeboxService';
import MusicPlayer from './MusicPlayer';
import { supabase } from '../services/supabaseClient';

interface Props {
  onBack: () => void;
}

export default function VenueScreen({ onBack }: Props) {
  const [eventCode, setEventCode] = useState('');
  const [event, setEvent] = useState<Event | null>(null);
  const [activeGame, setActiveGame] = useState<(Game & { options: GameOption[] }) | null>(null);
  const [teamScores, setTeamScores] = useState<{ team: Team; score: number }[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [approvedSongs, setApprovedSongs] = useState<SongRequest[]>([]);
  const [jukeboxQueue, setJukeboxQueue] = useState<SongRequest[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);

  const loadData = useCallback(async () => {
    if (!event) return;
    const [game, scores, parts, songs, anns] = await Promise.all([
      getActiveGame(event.id),
      getTeamScores(event.id),
      getParticipants(event.id),
      getSongRequests(event.id, 'approved'),
      getAnnouncements(event.id),
    ]);
    setActiveGame(game);
    setTeamScores(scores);
    setParticipants(parts);
    setApprovedSongs(songs);
    setAnnouncements(anns);

    if (event.mode === 'jukebox') {
      const jq = await getJukeboxQueue(event.id);
      setJukeboxQueue(jq);
    }

    if (game?.starts_at && game.status === 'active') {
      const elapsed = (Date.now() - new Date(game.starts_at).getTime()) / 1000;
      setTimeLeft(Math.max(0, game.time_limit_seconds - Math.floor(elapsed)));
    } else {
      setTimeLeft(0);
    }
  }, [event]);

  useEffect(() => { loadData(); }, [loadData]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Realtime
  useEffect(() => {
    if (!event) return;
    const ch = supabase
      .channel('venue-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `event_id=eq.${event.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `event_id=eq.${event.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements', filter: `event_id=eq.${event.id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'song_requests', filter: `event_id=eq.${event.id}` }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [event, loadData]);

  const handleConnect = async () => {
    if (!eventCode.trim()) return;
    const ev = await getEventByCode(eventCode);
    if (ev) setEvent(ev);
  };

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black">
        <button onClick={onBack} className="absolute top-6 left-6 text-gray-400 hover:text-white">← Back</button>
        <div className="text-5xl mb-6">📺</div>
        <h2 className="text-3xl font-bold mb-6">Venue Display</h2>
        <div className="w-full max-w-sm">
          <input
            type="text"
            placeholder="Enter event code"
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-gray-600 focus:outline-none focus:border-primary-500 mb-4"
            maxLength={6}
          />
          <button
            onClick={handleConnect}
            className="w-full py-3 bg-primary-500 text-white font-bold rounded-xl hover:bg-primary-600"
          >
            Connect
          </button>
        </div>
      </div>
    );
  }

  const sortedTeams = [...teamScores].sort((a, b) => b.score - a.score);
  const topPlayers = participants.slice(0, 10);

  return (
    <div className="min-h-screen bg-black text-white p-6 overflow-hidden">
      {/* Event Title */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black bg-gradient-to-r from-primary-400 via-pink-400 to-primary-600 bg-clip-text text-transparent">
          {event.name}
        </h1>
        <p className="text-gray-500 mt-1">
          Join at <span className="font-mono text-primary-400 font-bold text-lg">{event.event_code}</span>
          {' · '}{participants.length} players
        </p>
      </div>

      {/* Announcement banner */}
      {announcements.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-6 py-3 text-center mb-6">
          <span className="text-yellow-300 font-medium">📢 {announcements[0].message}</span>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Left: Question & Countdown */}
        <div className="col-span-8 flex flex-col gap-6">
          {activeGame && activeGame.status === 'active' ? (
            <>
              {/* Countdown */}
              <div className="text-center">
                <div className={`inline-block text-8xl font-black ${timeLeft <= 5 ? 'text-red-500 countdown-pulse' : 'text-primary-400'}`}>
                  {timeLeft}
                </div>
              </div>

              {/* Question */}
              <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 flex-1 flex items-center justify-center">
                <h2 className="text-4xl font-bold text-center leading-tight">{activeGame.question_text}</h2>
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-2 gap-4">
                {activeGame.options.map((opt, i) => {
                  const colors = ['bg-red-500/20 border-red-500/50', 'bg-blue-500/20 border-blue-500/50', 'bg-yellow-500/20 border-yellow-500/50', 'bg-green-500/20 border-green-500/50'];
                  const letters = ['A', 'B', 'C', 'D'];
                  return (
                    <div key={opt.id} className={`${colors[i]} border rounded-2xl p-4 flex items-center gap-3`}>
                      <span className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center font-bold text-lg">{letters[i]}</span>
                      <span className="text-xl font-medium">{opt.option_text}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : activeGame && activeGame.status === 'revealing' ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-4xl font-bold mb-4">Results!</h2>
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
                <p className="text-2xl text-center">{activeGame.question_text}</p>
                <div className="mt-4 space-y-2">
                  {activeGame.options.map((opt) => (
                    <div key={opt.id} className={`p-3 rounded-xl text-lg ${opt.is_correct ? 'bg-green-500/20 border border-green-500 text-green-300 font-bold' : 'bg-gray-800 text-gray-400'}`}>
                      {opt.is_correct && '✅ '}{opt.option_text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Now Playing */}
              {event.current_song_title ? (
                <div className="flex flex-col items-center mb-8">
                  {event.current_song_album_art ? (
                    <img src={event.current_song_album_art} alt="" className="w-48 h-48 rounded-2xl shadow-2xl mb-4" />
                  ) : (
                    <div className="text-8xl mb-4">🎵</div>
                  )}
                  <p className="text-sm text-gray-500 uppercase tracking-wider mb-1">Now Playing</p>
                  <h2 className="text-4xl font-black text-center">{event.current_song_title}</h2>
                  <p className="text-xl text-gray-400 mt-1">{event.current_song_artist}</p>
                </div>
              ) : (
                <>
                  <div className="text-8xl mb-6">🎵</div>
                  <h2 className="text-5xl font-black bg-gradient-to-r from-primary-400 to-pink-400 bg-clip-text text-transparent">
                    DJ Just Press Play
                  </h2>
                </>
              )}
              {event.mode !== 'jukebox' && (
                <p className="text-xl text-gray-500 mt-4">Next question coming soon...</p>
              )}

              {/* Jukebox music player */}
              {event.mode === 'jukebox' && jukeboxQueue.length > 0 && (
                <div className="mt-6 w-full max-w-md">
                  <MusicPlayer
                    queue={jukeboxQueue}
                    onSongEnd={(song) => updateSongRequestStatus(song.id, 'played').then(loadData)}
                  />
                </div>
              )}

              {/* Show approved songs when idle */}
              {approvedSongs.length > 0 && (
                <div className="mt-8 w-full max-w-lg">
                  <h3 className="text-lg font-bold text-gray-400 text-center mb-3">Coming Up</h3>
                  <div className="space-y-2">
                    {approvedSongs.slice(0, 5).map((s) => (
                      <div key={s.id} className="bg-gray-900 rounded-xl p-3 flex items-center gap-3 border border-gray-800">
                        {s.album_art ? (
                          <img src={s.album_art} alt="" className="w-10 h-10 rounded-md flex-shrink-0" />
                        ) : (
                          <span className="text-xl">🎶</span>
                        )}
                        <span className="font-medium">{s.song_title}</span>
                        <span className="text-gray-500">— {s.artist_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Scores & Leaderboard */}
        <div className="col-span-4 flex flex-col gap-6">
          {/* Team scores */}
          <div className="space-y-3">
            {sortedTeams.map((ts) => {
              const isMonts = ts.team.name === 'Montagues';
              return (
                <div key={ts.team.id} className={`${isMonts ? 'bg-red-500/10 border-red-500/30' : 'bg-blue-500/10 border-blue-500/30'} border rounded-2xl p-4 text-center`}>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">{ts.team.icon}</span>
                    <span className={`font-bold text-lg ${isMonts ? 'text-red-400' : 'text-blue-400'}`}>{ts.team.name}</span>
                  </div>
                  <div className="text-5xl font-black mt-1">{ts.score}</div>
                </div>
              );
            })}
          </div>

          {/* Top players */}
          <div className="bg-gray-900 rounded-2xl p-4 border border-gray-800 flex-1 overflow-y-auto">
            <h3 className="font-bold text-lg mb-3 text-center">🏆 Leaderboard</h3>
            <div className="space-y-2">
              {topPlayers.map((p, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                const isMonts = p.team?.name === 'Montagues';
                return (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="w-8 text-center">{medal || `#${i + 1}`}</span>
                    <span className={`w-2 h-2 rounded-full ${isMonts ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <span className="flex-1 truncate font-medium">{p.nickname}</span>
                    <span className="font-bold">{p.points}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
