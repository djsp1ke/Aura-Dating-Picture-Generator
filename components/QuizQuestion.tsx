import React, { useState, useEffect, useRef } from 'react';
import { Game, GameOption } from '../types';

interface Props {
  game: Game;
  options: GameOption[];
  onAnswer: (optionId: string, responseMs: number) => void;
}

export default function QuizQuestion({ game, options, onAnswer }: Props) {
  const [timeLeft, setTimeLeft] = useState(game.time_limit_seconds);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();
    if (game.starts_at) {
      const elapsed = (Date.now() - new Date(game.starts_at).getTime()) / 1000;
      setTimeLeft(Math.max(0, game.time_limit_seconds - Math.floor(elapsed)));
    }
  }, [game.starts_at, game.time_limit_seconds]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSelect = (optionId: string) => {
    if (selectedId || timeLeft <= 0) return;
    setSelectedId(optionId);
    const responseMs = Date.now() - startTimeRef.current;
    onAnswer(optionId, responseMs);
  };

  const progressPct = (timeLeft / game.time_limit_seconds) * 100;
  const isUrgent = timeLeft <= 5;

  return (
    <div className="slide-up">
      {/* Timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Round {game.round_number}</span>
          <span className={`text-2xl font-bold ${isUrgent ? 'text-red-400 countdown-pulse' : 'text-primary-400'}`}>
            {timeLeft}s
          </span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-primary-500'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="bg-surface-light rounded-2xl p-6 mb-6 border border-gray-700">
        <h2 className="text-xl font-bold text-center">{game.question_text}</h2>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, index) => {
          const letters = ['A', 'B', 'C', 'D'];
          const colors = [
            'from-red-500/20 to-red-600/20 border-red-500/40 hover:border-red-400',
            'from-blue-500/20 to-blue-600/20 border-blue-500/40 hover:border-blue-400',
            'from-yellow-500/20 to-yellow-600/20 border-yellow-500/40 hover:border-yellow-400',
            'from-green-500/20 to-green-600/20 border-green-500/40 hover:border-green-400',
          ];
          const isSelected = selectedId === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={!!selectedId || timeLeft <= 0}
              className={`w-full p-4 rounded-xl border text-left flex items-center gap-3 transition-all ${
                isSelected
                  ? 'bg-primary-500/30 border-primary-400 scale-[0.98]'
                  : `bg-gradient-to-r ${colors[index]} disabled:opacity-50`
              }`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                isSelected ? 'bg-primary-500 text-white' : 'bg-white/10'
              }`}>
                {letters[index]}
              </span>
              <span className="font-medium">{option.option_text}</span>
            </button>
          );
        })}
      </div>

      {timeLeft <= 0 && !selectedId && (
        <div className="text-center mt-6 text-gray-400">
          <p>Time's up! ⏰</p>
        </div>
      )}
    </div>
  );
}
