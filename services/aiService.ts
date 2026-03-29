import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export interface AIQuizQuestion {
  question: string;
  options: { text: string; isCorrect: boolean }[];
}

export interface QuizGenerationSettings {
  mode: 'song' | 'template';
  // Song-based
  songTitle?: string;
  artistName?: string;
  // Template-based
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

const DIFFICULTIES: Record<string, string> = {
  easy: 'Easy: well-known mainstream facts that most casual listeners would know',
  medium: 'Medium: moderately challenging, requires some music knowledge',
  hard: 'Hard: deep cuts, obscure trivia, details only music enthusiasts would know',
};

export { GENRES, ERAS };

export async function generateQuizQuestions(settings: QuizGenerationSettings): Promise<AIQuizQuestion[]> {
  if (!ai) {
    throw new Error('AI not configured. Set VITE_GEMINI_API_KEY in your environment.');
  }

  let prompt: string;

  if (settings.mode === 'song' && settings.songTitle && settings.artistName) {
    prompt = `Generate ${settings.count} music trivia quiz question(s) about the song "${settings.songTitle}" by ${settings.artistName}.

Difficulty: ${DIFFICULTIES[settings.difficulty]}

Create questions about the song itself, the artist, the album it appeared on, its chart performance, music video, cultural impact, or related musical facts. Make the questions engaging for a pub quiz setting.`;
  } else {
    const genreStr = settings.genre ? `Genre: ${settings.genre}` : 'Genre: Any/mixed';
    const eraStr = settings.era ? `Era: ${settings.era}` : 'Era: Any/mixed';

    prompt = `Generate ${settings.count} music trivia quiz question(s) for a live pub quiz game.

${genreStr}
${eraStr}
Difficulty: ${DIFFICULTIES[settings.difficulty]}

Create fun, engaging questions about artists, songs, albums, music history, lyrics, music videos, chart records, or cultural moments. Perfect for a lively pub atmosphere.`;
  }

  prompt += `

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences. Return an array of objects with this exact structure:
[
  {
    "question": "What is the question?",
    "options": [
      {"text": "Wrong answer 1", "isCorrect": false},
      {"text": "Wrong answer 2", "isCorrect": false},
      {"text": "Correct answer", "isCorrect": true},
      {"text": "Wrong answer 3", "isCorrect": false}
    ]
  }
]

Each question must have exactly 4 options with exactly 1 correct answer. Randomize the position of the correct answer.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  const text = response.text?.trim() || '';

  // Strip markdown fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  try {
    const questions: AIQuizQuestion[] = JSON.parse(cleaned);

    // Validate structure
    return questions.filter(
      (q) =>
        q.question &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.filter((o) => o.isCorrect).length === 1
    );
  } catch {
    throw new Error('AI returned invalid format. Please try again.');
  }
}
