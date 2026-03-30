import { supabase } from './supabaseClient';
import { SongRequest } from '../types';
import { SONG_REQUEST_COOLDOWN_MS } from '../constants';

export async function submitSongRequest(
  eventId: string,
  participantId: string,
  songTitle: string,
  artistName: string,
  albumArt?: string,
  spotifyUri?: string
): Promise<SongRequest> {
  // Check cooldown
  const { data: recent } = await supabase
    .from('song_requests')
    .select('created_at')
    .eq('participant_id', participantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (recent?.created_at) {
    const elapsed = Date.now() - new Date(recent.created_at).getTime();
    if (elapsed < SONG_REQUEST_COOLDOWN_MS) {
      const remaining = Math.ceil((SONG_REQUEST_COOLDOWN_MS - elapsed) / 1000);
      throw new Error(`Please wait ${remaining} seconds before requesting another song`);
    }
  }

  const { data, error } = await supabase
    .from('song_requests')
    .insert({
      event_id: eventId,
      participant_id: participantId,
      song_title: songTitle,
      artist_name: artistName,
      album_art: albumArt || null,
      spotify_uri: spotifyUri || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSongRequests(eventId: string, status?: string): Promise<SongRequest[]> {
  let query = supabase
    .from('song_requests')
    .select('*, participant:participants(nickname)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function updateSongRequestStatus(
  requestId: string,
  status: SongRequest['status']
): Promise<void> {
  const { error } = await supabase
    .from('song_requests')
    .update({ status })
    .eq('id', requestId);

  if (error) throw error;
}
