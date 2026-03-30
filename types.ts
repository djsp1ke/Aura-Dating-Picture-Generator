export interface Event {
  id: string;
  name: string;
  venue_name: string;
  event_code: string;
  status: 'pending' | 'active' | 'ended';
  mode: 'dj' | 'jukebox';
  current_song_title?: string | null;
  current_song_artist?: string | null;
  current_song_album_art?: string | null;
  current_song_spotify_uri?: string | null;
  song_request_scenario?: string | null;
  default_timer_seconds: number;
  created_at?: string;
}

export interface Team {
  id: string;
  event_id: string;
  name: string;
  short_code: string;
  icon: string;
}

export interface Participant {
  id: string;
  event_id: string;
  team_id: string;
  nickname: string;
  device_token: string;
  points: number;
  team?: Team;
}

export interface Game {
  id: string;
  event_id: string;
  round_number: number;
  question_text: string;
  status: 'pending' | 'active' | 'revealing' | 'completed';
  starts_at: string | null;
  fastest_submission_id: string | null;
  time_limit_seconds: number;
  options?: GameOption[];
}

export interface GameOption {
  id: string;
  game_id: string;
  option_text: string;
  is_correct: boolean;
}

export interface GameSubmission {
  id: string;
  game_id: string;
  participant_id: string;
  selected_option_id: string;
  is_correct: boolean;
  response_ms: number;
  points_awarded: number;
}

export interface SongRequest {
  id: string;
  event_id: string;
  participant_id: string;
  song_title: string;
  artist_name: string;
  album_art?: string | null;
  spotify_uri?: string | null;
  votes?: number;
  status: 'pending' | 'approved' | 'rejected' | 'played';
  created_at?: string;
  participant?: Participant;
}

export interface SongVote {
  id: string;
  song_request_id: string;
  participant_id: string;
}

export interface Announcement {
  id: string;
  event_id: string;
  message: string;
  created_at?: string;
}

export type AppView = 'landing' | 'join' | 'guest' | 'dj' | 'venue' | 'jukebox';

export interface AppState {
  view: AppView;
  event: Event | null;
  participant: Participant | null;
  isDJ: boolean;
}
