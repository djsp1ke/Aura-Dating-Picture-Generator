import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SongRequest } from '../types';

interface Props {
  queue: SongRequest[];
  onSongEnd?: (song: SongRequest) => void;
  compact?: boolean;
}

export default function MusicPlayer({ queue, onSongEnd, compact = false }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval>>();

  const playable = queue.filter((s) => s.preview_url);
  const current = playable[currentIndex] || null;

  const stopProgress = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = undefined;
    }
  }, []);

  const startProgress = useCallback(() => {
    stopProgress();
    progressInterval.current = setInterval(() => {
      if (audioRef.current) {
        setProgress(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
      }
    }, 200);
  }, [stopProgress]);

  const play = useCallback(async () => {
    if (!audioRef.current || !current?.preview_url) return;
    try {
      audioRef.current.src = current.preview_url;
      await audioRef.current.play();
      setIsPlaying(true);
      startProgress();
    } catch {
      setIsPlaying(false);
    }
  }, [current, startProgress]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    stopProgress();
  }, [stopProgress]);

  const next = useCallback(() => {
    pause();
    setProgress(0);
    if (current && onSongEnd) onSongEnd(current);
    if (currentIndex < playable.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  }, [pause, current, onSongEnd, currentIndex, playable.length]);

  const prev = useCallback(() => {
    pause();
    setProgress(0);
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [pause, currentIndex]);

  // Auto-play when index changes and was playing
  useEffect(() => {
    if (isPlaying && current?.preview_url) {
      play();
    }
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle song end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnd = () => next();
    audio.addEventListener('ended', handleEnd);
    return () => audio.removeEventListener('ended', handleEnd);
  }, [next]);

  // Cleanup
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 1;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; stopProgress(); };
  }, [stopProgress]);

  // Reset index if queue changes significantly
  useEffect(() => {
    if (currentIndex >= playable.length) setCurrentIndex(0);
  }, [playable.length, currentIndex]);

  if (playable.length === 0) return null;

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className="bg-surface-light rounded-xl p-3 border border-gray-700">
        <div className="flex items-center gap-3">
          {current?.album_art ? (
            <img src={current.album_art} alt="" className="w-10 h-10 rounded-md flex-shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-md bg-gray-700 flex items-center justify-center text-lg">🎵</div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{current?.song_title || 'No song'}</div>
            <div className="text-xs text-gray-400 truncate">{current?.artist_name}</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={prev} disabled={currentIndex === 0} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30">⏮</button>
            <button
              onClick={isPlaying ? pause : play}
              className="w-10 h-10 flex items-center justify-center bg-primary-500 rounded-full text-white text-lg hover:bg-primary-400"
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={next} disabled={playable.length <= 1} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-30">⏭</button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500 w-8 text-right">{formatTime(progress)}</span>
          <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (!audioRef.current || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              audioRef.current.currentTime = pct * duration;
              setProgress(pct * duration);
            }}
          >
            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs text-gray-500 w-8">{formatTime(duration)}</span>
        </div>
      </div>
    );
  }

  // Full player (for venue screen)
  return (
    <div className="bg-gray-900 rounded-3xl p-6 border border-gray-800">
      <div className="flex flex-col items-center">
        {current?.album_art ? (
          <img src={current.album_art} alt="" className="w-40 h-40 rounded-2xl shadow-2xl mb-4" />
        ) : (
          <div className="w-40 h-40 rounded-2xl bg-gray-800 flex items-center justify-center text-6xl mb-4">🎵</div>
        )}
        <p className="text-sm text-primary-300 uppercase tracking-wider mb-1">Preview</p>
        <h3 className="text-2xl font-bold text-center">{current?.song_title}</h3>
        <p className="text-gray-400 mt-1">{current?.artist_name}</p>

        {/* Progress bar */}
        <div className="w-full mt-4 flex items-center gap-3">
          <span className="text-xs text-gray-500 w-10 text-right">{formatTime(progress)}</span>
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (!audioRef.current || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = (e.clientX - rect.left) / rect.width;
              audioRef.current.currentTime = pct * duration;
              setProgress(pct * duration);
            }}
          >
            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-xs text-gray-500 w-10">{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mt-4">
          <button onClick={prev} disabled={currentIndex === 0} className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-white text-xl disabled:opacity-30">⏮</button>
          <button
            onClick={isPlaying ? pause : play}
            className="w-16 h-16 flex items-center justify-center bg-primary-500 rounded-full text-white text-2xl hover:bg-primary-400 pulse-glow"
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={next} disabled={playable.length <= 1} className="w-12 h-12 flex items-center justify-center text-gray-400 hover:text-white text-xl disabled:opacity-30">⏭</button>
        </div>

        <p className="text-xs text-gray-600 mt-3">
          {currentIndex + 1} of {playable.length} · 30s previews
        </p>
      </div>
    </div>
  );
}
