import React, { useState } from 'react';
import { AppView } from '../types';

interface Props {
  onNavigate: (view: AppView) => void;
  onDJLogin: (eventCode: string) => void;
}

export default function LandingScreen({ onNavigate, onDJLogin }: Props) {
  const [showDJ, setShowDJ] = useState(false);
  const [djCode, setDJCode] = useState('');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-surface-dark via-surface to-surface-dark">
      <div className="text-center mb-12 slide-up">
        <div className="text-6xl mb-4">🎵</div>
        <h1 className="text-5xl font-black tracking-tight bg-gradient-to-r from-primary-400 via-pink-400 to-primary-600 bg-clip-text text-transparent">
          DJ Just Press Play
        </h1>
        <p className="text-gray-400 mt-3 text-lg">Live music games for your venue</p>
      </div>

      <div className="w-full max-w-sm space-y-4 slide-up">
        <button
          onClick={() => onNavigate('join')}
          className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-primary-700 text-white font-bold text-lg rounded-2xl hover:from-primary-600 hover:to-primary-800 transition-all pulse-glow"
        >
          Join a Game
        </button>

        <button
          onClick={() => onNavigate('venue')}
          className="w-full py-4 px-6 bg-surface-light border border-gray-700 text-white font-semibold text-lg rounded-2xl hover:bg-gray-800 transition-all"
        >
          Venue Display
        </button>

        <button
          onClick={() => setShowDJ(!showDJ)}
          className="w-full py-3 px-6 text-gray-400 font-medium hover:text-white transition-colors"
        >
          DJ Login
        </button>

        {showDJ && (
          <div className="bg-surface-light rounded-2xl p-4 border border-gray-700 slide-up">
            <input
              type="text"
              placeholder="Event code (or leave blank for new)"
              value={djCode}
              onChange={(e) => setDJCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-surface-dark border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 mb-3"
              maxLength={6}
            />
            <button
              onClick={() => onDJLogin(djCode)}
              className="w-full py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors"
            >
              {djCode ? 'Open DJ Panel' : 'Create New Event'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
