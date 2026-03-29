export const TEAMS = {
  MONTAGUES: {
    name: 'Montagues',
    short_code: 'MON',
    icon: '🗡️',
    color: 'montague',
    bgClass: 'bg-red-500',
    textClass: 'text-red-400',
    borderClass: 'border-red-500',
    bgLightClass: 'bg-red-500/20',
  },
  CAPULETS: {
    name: 'Capulets',
    short_code: 'CAP',
    icon: '🛡️',
    color: 'capulet',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500',
    bgLightClass: 'bg-blue-500/20',
  },
} as const;

export const SCORING = {
  PARTICIPATION: 1,
  CORRECT: 5,
  FASTEST: 5,
} as const;

export const SONG_REQUEST_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

export const QUIZ_TIME_LIMIT_SECONDS = 15;
