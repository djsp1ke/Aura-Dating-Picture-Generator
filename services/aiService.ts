export interface AIQuizQuestion {
  question: string;
  options: { text: string; isCorrect: boolean }[];
}

export interface QuizGenerationSettings {
  mode: 'song' | 'template';
  songTitle?: string;
  artistName?: string;
  genre?: string;
  era?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
}

const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Country', 'Electronic/Dance',
  'Indie', 'Jazz', 'Blues', 'Reggae', 'Punk', 'Metal', 'Soul/Funk',
  'Latin', 'Classical', 'Folk', 'Alternative', 'Disco',
];

const ERAS = [
  '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s',
];

export { GENRES, ERAS };

export async function generateQuizQuestions(settings: QuizGenerationSettings): Promise<AIQuizQuestion[]> {
  const response = await fetch('/.netlify/functions/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  const questions: AIQuizQuestion[] = await response.json();
  return questions;
}
