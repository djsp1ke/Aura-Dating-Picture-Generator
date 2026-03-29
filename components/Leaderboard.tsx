import React, { useState, useEffect } from 'react';
import { Participant, Team } from '../types';
import { getTeamScores } from '../services/eventService';

interface Props {
  participants: Participant[];
  currentParticipantId?: string;
  eventId: string;
}

export default function Leaderboard({ participants, currentParticipantId, eventId }: Props) {
  const [teamScores, setTeamScores] = useState<{ team: Team; score: number }[]>([]);
  const [view, setView] = useState<'individual' | 'teams'>('teams');

  useEffect(() => {
    getTeamScores(eventId).then(setTeamScores);
  }, [eventId, participants]);

  const sortedTeams = [...teamScores].sort((a, b) => b.score - a.score);

  return (
    <div>
      {/* Toggle */}
      <div className="flex bg-surface-light rounded-xl p-1 mb-6">
        <button
          onClick={() => setView('teams')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'teams' ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400'
          }`}
        >
          Team Scores
        </button>
        <button
          onClick={() => setView('individual')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'individual' ? 'bg-primary-500/20 text-primary-400' : 'text-gray-400'
          }`}
        >
          Individual
        </button>
      </div>

      {view === 'teams' ? (
        <div className="space-y-4">
          {sortedTeams.map((ts, i) => {
            const isMonts = ts.team.name === 'Montagues';
            const color = isMonts ? 'red' : 'blue';
            return (
              <div
                key={ts.team.id}
                className={`bg-${color}-500/10 border border-${color}-500/30 rounded-2xl p-6 text-center`}
              >
                <div className="text-3xl mb-2">{ts.team.icon}</div>
                <h3 className={`text-xl font-bold text-${color}-400`}>{ts.team.name}</h3>
                <div className="text-4xl font-black mt-2">{ts.score}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {i === 0 && sortedTeams.length > 1 && ts.score > sortedTeams[1].score ? '👑 Leading!' : 'points'}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {participants.map((p, index) => {
            const isMe = p.id === currentParticipantId;
            const isMonts = p.team?.name === 'Montagues';
            const teamColor = isMonts ? 'red' : 'blue';
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';

            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isMe ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-surface-light'
                }`}
              >
                <span className="w-8 text-center font-bold text-gray-500">
                  {medal || `#${index + 1}`}
                </span>
                <span className={`w-2 h-2 rounded-full bg-${teamColor}-500`} />
                <span className={`flex-1 font-medium ${isMe ? 'text-primary-300' : ''}`}>
                  {p.nickname} {isMe && '(you)'}
                </span>
                <span className="font-bold text-lg">{p.points}</span>
              </div>
            );
          })}

          {participants.length === 0 && (
            <p className="text-gray-500 text-center py-8">No players yet</p>
          )}
        </div>
      )}
    </div>
  );
}
