import React, { useState, useEffect, useCallback } from 'react';
import { Event, Participant, Game, GameOption, Announcement, SongRequest } from '../types';
import { getActiveGame, submitAnswer, getSubmission } from '../services/gameService';
import { submitSongRequest, getSongRequests } from '../services/songRequestService';
import { getParticipants, getAnnouncements, getEventById } from '../services/eventService';
import { supabase } from '../services/supabaseClient';
import QuizQuestion from './QuizQuestion';
import Leaderboard from './Leaderboard';
import SongRequestForm from './SongRequestForm';

interface Props {
  event: Event;
  participant: Participant;
}

type Tab = 'game' | 'leaderboard' | 'songs';

export default function GuestView({ event, participant }: Props) {
  const [tab, setTab] = useState<Tab>('game');
  const [activeGame, setActiveGame] = useState<(Game & { options: GameOption[] }) | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{ isCorrect: boolean; points: number } | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [songRequests, setSongRequests] = useState<SongRequest[]>([]);
  const [currentPoints, setCurrentPoints] = useState(participant.points);
  const [songError, setSongError] = useState<string | null>(null);
  const [currentEvent, setCurrentEvent] = useState(event);

  const teamColor = participant.team?.name === 'Montagues' ? 'red' : 'blue';
  const teamIcon = participant.team?.icon || '🎵';

  const loadData = useCallback(async () => {
    const [game, parts, anns, songs, latestEvent] = await Promise.all([
      getActiveGame(event.id),
      getParticipants(event.id),
      getAnnouncements(event.id),
      getSongRequests(event.id, 'approved'),
      getEventById(event.id),
    ]);

    if (latestEvent) setCurrentEvent(latestEvent);

    setActiveGame(game);
    setParticipants(parts);
    setAnnouncements(anns);
    setSongRequests(songs);

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

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscriptions
  useEffect(() => {
    const channels = [
      supabase
        .channel('guest-games')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'games', filter: `event_id=eq.${event.id}` }, () => loadData())
        .subscribe(),
      supabase
        .channel('guest-participants')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `event_id=eq.${event.id}` }, () => loadData())
        .subscribe(),
      supabase
        .channel('guest-announcements')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements', filter: `event_id=eq.${event.id}` }, () => loadData())
        .subscribe(),
      supabase
        .channel('guest-songs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'song_requests', filter: `event_id=eq.${event.id}` }, () => loadData())
        .subscribe(),
      supabase
        .channel('guest-events')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${event.id}` }, () => loadData())
        .subscribe(),
    ];

    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [event.id, loadData]);

  const handleAnswer = async (optionId: string, responseMs: number) => {
    if (!activeGame || hasSubmitted) return;
    try {
      const result = await submitAnswer(activeGame.id, participant.id, optionId, responseMs);
      setHasSubmitted(true);
      setSubmissionResult({ isCorrect: result.is_correct, points: result.points_awarded });
      setCurrentPoints((p) => p + result.points_awarded);
    } catch (err: any) {
      if (err.message === 'Already submitted') {
        setHasSubmitted(true);
      }
    }
  };

  const handleSongRequest = async (title: string, artist: string, albumArt?: string, spotifyUri?: string) => {
    setSongError(null);
    try {
      await submitSongRequest(event.id, participant.id, title, artist, albumArt, spotifyUri);
    } catch (err: any) {
      setSongError(err.message);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-dark via-surface to-surface-dark">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-dark/90 backdrop-blur-md border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl">{teamIcon}</span>
            <span className="font-bold">{participant.nickname}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-${teamColor}-500/20 text-${teamColor}-400 font-medium`}>
              {participant.team?.name}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Points</div>
            <div className="text-lg font-bold text-primary-400">{currentPoints}</div>
          </div>
        </div>
      </div>

      {/* Announcements banner */}
      {announcements.length > 0 && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 text-center">
          <span className="text-yellow-300 text-sm font-medium">📢 {announcements[0].message}</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-gray-800 max-w-lg mx-auto">
        {([['game', '🎮 Game'], ['leaderboard', '🏆 Scores'], ['songs', '🎵 Songs']] as [Tab, string][]).map(([t, label]) => (
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

      {/* Content */}
      <div className="max-w-lg mx-auto p-4">
        {tab === 'game' && (
          <>
            {activeGame && activeGame.status === 'active' && !hasSubmitted ? (
              <QuizQuestion
                game={activeGame}
                options={activeGame.options}
                onAnswer={handleAnswer}
              />
            ) : activeGame && hasSubmitted ? (
              <div className="text-center py-12 slide-up">
                <div className="text-5xl mb-4">{submissionResult?.isCorrect ? '✅' : '❌'}</div>
                <h3 className="text-2xl font-bold mb-2">
                  {submissionResult?.isCorrect ? 'Correct!' : 'Not quite!'}
                </h3>
                <p className="text-gray-400 mb-4">
                  +{submissionResult?.points || 0} points
                </p>
                {activeGame.status === 'revealing' && (
                  <p className="text-primary-300 text-sm">Results are in!</p>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🎵</div>
                <h3 className="text-xl font-bold text-gray-300 mb-2">Waiting for next question...</h3>
                <p className="text-gray-500">The DJ will launch the next round soon</p>
                <div className="mt-6 flex justify-center">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce mx-1" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce mx-1" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce mx-1" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'leaderboard' && (
          <Leaderboard participants={participants} currentParticipantId={participant.id} eventId={event.id} />
        )}

        {tab === 'songs' && (
          <SongRequestForm
            onSubmit={handleSongRequest}
            approvedRequests={songRequests}
            error={songError}
            scenario={currentEvent.song_request_scenario}
          />
        )}
      </div>
    </div>
  );
}
