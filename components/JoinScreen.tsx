import React, { useState } from 'react';

interface Props {
  onJoin: (eventCode: string, nickname: string) => Promise<void>;
  onBack: () => void;
  error: string | null;
  loading: boolean;
}

export default function JoinScreen({ onJoin, onBack, error, loading }: Props) {
  const [eventCode, setEventCode] = useState('');
  const [nickname, setNickname] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventCode.trim() || !nickname.trim()) return;
    await onJoin(eventCode.trim(), nickname.trim());
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-surface-dark via-surface to-surface-dark">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-gray-400 hover:text-white transition-colors"
      >
        ← Back
      </button>

      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🎤</div>
        <h2 className="text-3xl font-bold">Join the Game</h2>
        <p className="text-gray-400 mt-2">Enter your event code and pick a name</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 slide-up">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Event Code</label>
          <input
            type="text"
            placeholder="e.g. ABC123"
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 bg-surface-light border border-gray-600 rounded-xl text-white text-center text-2xl font-mono tracking-widest placeholder-gray-500 focus:outline-none focus:border-primary-500"
            maxLength={6}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Your Nickname</label>
          <input
            type="text"
            placeholder="What should we call you?"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full px-4 py-3 bg-surface-light border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500"
            maxLength={20}
          />
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!eventCode.trim() || !nickname.trim() || loading}
          className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-bold text-lg rounded-2xl hover:from-primary-600 hover:to-primary-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Joining...' : 'Join Game'}
        </button>
      </form>
    </div>
  );
}
