import { supabase } from './supabaseClient';
import { SongRequest } from '../types';

export async function voteSong(songRequestId: string, participantId: string): Promise<void> {
  const { error } = await supabase
    .from('song_votes')
    .insert({ song_request_id: songRequestId, participant_id: participantId });

  if (error) {
    if (error.code === '23505') return; // Already voted — ignore
    throw error;
  }
}

export async function unvoteSong(songRequestId: string, participantId: string): Promise<void> {
  const { error } = await supabase
    .from('song_votes')
    .delete()
    .eq('song_request_id', songRequestId)
    .eq('participant_id', participantId);

  if (error) throw error;
}

export async function getMyVotes(participantId: string, eventId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('song_votes')
    .select('song_request_id, song_requests!inner(event_id)')
    .eq('participant_id', participantId)
    .eq('song_requests.event_id', eventId);

  return new Set((data || []).map((v: any) => v.song_request_id));
}

export async function getJukeboxQueue(eventId: string): Promise<(SongRequest & { votes: number })[]> {
  // Get all non-played requests with vote counts
  const { data: requests, error } = await supabase
    .from('song_requests')
    .select('*, participant:participants(nickname)')
    .eq('event_id', eventId)
    .in('status', ['pending', 'approved'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!requests || requests.length === 0) return [];

  // Get vote counts
  const { data: voteCounts } = await supabase
    .from('song_votes')
    .select('song_request_id')
    .in('song_request_id', requests.map((r: any) => r.id));

  const countMap: Record<string, number> = {};
  (voteCounts || []).forEach((v: any) => {
    countMap[v.song_request_id] = (countMap[v.song_request_id] || 0) + 1;
  });

  return requests
    .map((r: any) => ({ ...r, votes: countMap[r.id] || 0 }))
    .sort((a: any, b: any) => b.votes - a.votes || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function getPlayedSongs(eventId: string): Promise<SongRequest[]> {
  const { data, error } = await supabase
    .from('song_requests')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'played')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}
