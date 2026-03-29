import { supabase } from './supabaseClient';
import { Game, GameOption, GameSubmission } from '../types';
import { SCORING } from '../constants';

export async function createGame(
  eventId: string,
  roundNumber: number,
  questionText: string,
  options: { text: string; isCorrect: boolean }[],
  timeLimitSeconds: number = 15
): Promise<Game> {
  const { data: game, error } = await supabase
    .from('games')
    .insert({
      event_id: eventId,
      round_number: roundNumber,
      question_text: questionText,
      status: 'pending',
      time_limit_seconds: timeLimitSeconds,
    })
    .select()
    .single();

  if (error) throw error;

  const { error: optError } = await supabase
    .from('game_options')
    .insert(
      options.map((opt) => ({
        game_id: game.id,
        option_text: opt.text,
        is_correct: opt.isCorrect,
      }))
    );

  if (optError) throw optError;

  return game;
}

export async function launchGame(gameId: string): Promise<void> {
  const { error } = await supabase
    .from('games')
    .update({ status: 'active', starts_at: new Date().toISOString() })
    .eq('id', gameId);

  if (error) throw error;
}

export async function endGame(gameId: string): Promise<void> {
  // Find fastest correct submission
  const { data: fastest } = await supabase
    .from('game_submissions')
    .select('id')
    .eq('game_id', gameId)
    .eq('is_correct', true)
    .order('response_ms', { ascending: true })
    .limit(1)
    .single();

  const updates: Record<string, unknown> = { status: 'revealing' };
  if (fastest) {
    updates.fastest_submission_id = fastest.id;

    // Award fastest bonus
    const { data: sub } = await supabase
      .from('game_submissions')
      .select('participant_id, points_awarded')
      .eq('id', fastest.id)
      .single();

    if (sub) {
      await supabase
        .from('game_submissions')
        .update({ points_awarded: sub.points_awarded + SCORING.FASTEST })
        .eq('id', fastest.id);

      await supabase.rpc('increment_points', {
        p_id: sub.participant_id,
        amount: SCORING.FASTEST,
      });
    }
  }

  const { error } = await supabase
    .from('games')
    .update(updates)
    .eq('id', gameId);

  if (error) throw error;
}

export async function completeGame(gameId: string): Promise<void> {
  const { error } = await supabase
    .from('games')
    .update({ status: 'completed' })
    .eq('id', gameId);

  if (error) throw error;
}

export async function submitAnswer(
  gameId: string,
  participantId: string,
  selectedOptionId: string,
  responseMs: number
): Promise<GameSubmission> {
  // Check if already submitted
  const { data: existing } = await supabase
    .from('game_submissions')
    .select('id')
    .eq('game_id', gameId)
    .eq('participant_id', participantId)
    .single();

  if (existing) throw new Error('Already submitted');

  // Check if correct
  const { data: option } = await supabase
    .from('game_options')
    .select('is_correct')
    .eq('id', selectedOptionId)
    .single();

  const isCorrect = option?.is_correct || false;
  let pointsAwarded = SCORING.PARTICIPATION;
  if (isCorrect) pointsAwarded += SCORING.CORRECT;

  const { data: submission, error } = await supabase
    .from('game_submissions')
    .insert({
      game_id: gameId,
      participant_id: participantId,
      selected_option_id: selectedOptionId,
      is_correct: isCorrect,
      response_ms: responseMs,
      points_awarded: pointsAwarded,
    })
    .select()
    .single();

  if (error) throw error;

  // Update participant points
  await supabase.rpc('increment_points', {
    p_id: participantId,
    amount: pointsAwarded,
  });

  return submission;
}

export async function getActiveGame(eventId: string): Promise<(Game & { options: GameOption[] }) | null> {
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('event_id', eventId)
    .in('status', ['active', 'revealing'])
    .order('round_number', { ascending: false })
    .limit(1)
    .single();

  if (!game) return null;

  const { data: options } = await supabase
    .from('game_options')
    .select('*')
    .eq('game_id', game.id);

  return { ...game, options: options || [] };
}

export async function getGames(eventId: string): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*, options:game_options(*)')
    .eq('event_id', eventId)
    .order('round_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getSubmission(gameId: string, participantId: string): Promise<GameSubmission | null> {
  const { data } = await supabase
    .from('game_submissions')
    .select('*')
    .eq('game_id', gameId)
    .eq('participant_id', participantId)
    .single();

  return data;
}

export async function getGameResults(gameId: string): Promise<GameSubmission[]> {
  const { data, error } = await supabase
    .from('game_submissions')
    .select('*')
    .eq('game_id', gameId)
    .order('response_ms', { ascending: true });

  if (error) throw error;
  return data || [];
}
