const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

const DIFFICULTIES: Record<string, string> = {
  easy: 'Easy: well-known mainstream facts that most casual listeners would know',
  medium: 'Medium: moderately challenging, requires some music knowledge',
  hard: 'Hard: deep cuts, obscure trivia, details only music enthusiasts would know',
};

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  if (!ANTHROPIC_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured on server' }) };
  }

  let settings: {
    mode: 'song' | 'template';
    songTitle?: string;
    artistName?: string;
    genre?: string;
    era?: string;
    difficulty: string;
    count: number;
  };

  try {
    settings = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  let prompt: string;

  if (settings.mode === 'song' && settings.songTitle && settings.artistName) {
    prompt = `Generate ${settings.count} music trivia quiz question(s) about the song "${settings.songTitle}" by ${settings.artistName}.

Difficulty: ${DIFFICULTIES[settings.difficulty] || DIFFICULTIES.medium}

Create questions about the song itself, the artist, the album it appeared on, its chart performance, music video, cultural impact, or related musical facts. Make the questions engaging for a pub quiz setting.`;
  } else {
    const genreStr = settings.genre ? `Genre: ${settings.genre}` : 'Genre: Any/mixed';
    const eraStr = settings.era ? `Era: ${settings.era}` : 'Era: Any/mixed';

    prompt = `Generate ${settings.count} music trivia quiz question(s) for a live pub quiz game.

${genreStr}
${eraStr}
Difficulty: ${DIFFICULTIES[settings.difficulty] || DIFFICULTIES.medium}

Create fun, engaging questions about artists, songs, albums, music history, lyrics, music videos, chart records, or cultural moments. Perfect for a lively pub atmosphere.`;
  }

  prompt += `

IMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation. Return an array of objects with this exact structure:
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

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errData = await response.json();
        detail = errData?.error?.message || JSON.stringify(errData);
      } catch {
        detail = await response.text();
      }
      return { statusCode: 502, body: JSON.stringify({ error: `Claude API error (${response.status}): ${detail}` }) };
    }

    const data = await response.json();
    const text = (data.content?.[0]?.text || '').trim();
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    const questions = JSON.parse(cleaned);
    const validated = questions.filter(
      (q: any) =>
        q.question &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.options.filter((o: any) => o.isCorrect).length === 1
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validated),
    };
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || 'Failed to generate questions' }) };
  }
};
