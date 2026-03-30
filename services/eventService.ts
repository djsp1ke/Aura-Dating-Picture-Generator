import { supabase } from './supabaseClient';
import { Event, Team, Participant, Announcement } from '../types';

export async function createEvent(name: string, venueName: string, mode: 'dj' | 'jukebox' = 'dj'): Promise<{ event: Event; teams: Team[] }> {
  const eventCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data: event, error } = await supabase
    .from('events')
    .insert({ name, venue_name: venueName, event_code: eventCode, status: mode === 'jukebox' ? 'active' : 'pending', mode, default_timer_seconds: 15 })
    .select()
    .single();

  if (error) throw error;

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .insert([
      { event_id: event.id, name: 'Montagues', short_code: 'MON', icon: '🗡️' },
      { event_id: event.id, name: 'Capulets', short_code: 'CAP', icon: '🛡️' },
    ])
    .select();

  if (teamsError) throw teamsError;

  return { event, teams };
}

export async function getEventByCode(code: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code.toUpperCase())
    .single();

  if (error) return null;
  return data;
}

export async function updateEventStatus(eventId: string, status: Event['status']): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({ status })
    .eq('id', eventId);

  if (error) throw error;
}

export async function updateEvent(eventId: string, updates: Partial<Pick<Event, 'current_song_title' | 'current_song_artist' | 'current_song_album_art' | 'current_song_spotify_uri' | 'song_request_scenario' | 'default_timer_seconds' | 'name' | 'venue_name'>>): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function joinEvent(eventId: string, nickname: string): Promise<Participant> {
  const deviceToken = crypto.randomUUID();

  // Get teams and their member counts to balance assignment
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, short_code, icon')
    .eq('event_id', eventId);

  if (!teams || teams.length < 2) throw new Error('Event teams not found');

  const counts = await Promise.all(
    teams.map(async (team) => {
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id);
      return { team, count: count || 0 };
    })
  );

  // Assign to team with fewer members
  counts.sort((a, b) => a.count - b.count);
  const assignedTeam = counts[0].team;

  const { data: participant, error } = await supabase
    .from('participants')
    .insert({
      event_id: eventId,
      team_id: assignedTeam.id,
      nickname,
      device_token: deviceToken,
      points: 0,
    })
    .select('*, team:teams(*)')
    .single();

  if (error) throw error;
  return participant;
}

export async function getParticipantByToken(deviceToken: string): Promise<Participant | null> {
  const { data, error } = await supabase
    .from('participants')
    .select('*, team:teams(*)')
    .eq('device_token', deviceToken)
    .single();

  if (error) return null;
  return data;
}

export async function getEventById(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) return null;
  return data;
}

export async function getParticipants(eventId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('*, team:teams(*)')
    .eq('event_id', eventId)
    .order('points', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getTeams(eventId: string): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('event_id', eventId);

  if (error) throw error;
  return data || [];
}

export async function getTeamScores(eventId: string): Promise<{ team: Team; score: number }[]> {
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .eq('event_id', eventId);

  if (!teams) return [];

  const scores = await Promise.all(
    teams.map(async (team) => {
      const { data: participants } = await supabase
        .from('participants')
        .select('points')
        .eq('team_id', team.id);

      const score = (participants || []).reduce((sum, p) => sum + p.points, 0);
      return { team, score };
    })
  );

  return scores;
}

export async function sendAnnouncement(eventId: string, message: string): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ event_id: eventId, message })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getAnnouncements(eventId: string): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}
