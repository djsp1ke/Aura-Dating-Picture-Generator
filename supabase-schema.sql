-- DJ Just Press Play — Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Events table
create table events (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  venue_name text not null,
  event_code text unique not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  mode text not null default 'dj' check (mode in ('dj', 'jukebox')),
  current_song_title text,
  current_song_artist text,
  current_song_album_art text,
  current_song_spotify_uri text,
  song_request_scenario text,
  default_timer_seconds integer default 15 not null,
  created_at timestamptz default now()
);

-- Teams table
create table teams (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  name text not null,
  short_code text not null,
  icon text not null
);

-- Participants table
create table participants (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  team_id uuid references teams(id) on delete cascade not null,
  nickname text not null,
  device_token text unique not null,
  points integer default 0 not null
);

-- Games (quiz rounds) table
create table games (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  round_number integer not null,
  question_text text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'revealing', 'completed')),
  starts_at timestamptz,
  fastest_submission_id uuid,
  time_limit_seconds integer default 15 not null
);

-- Game options (answer choices)
create table game_options (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references games(id) on delete cascade not null,
  option_text text not null,
  is_correct boolean default false not null
);

-- Game submissions (player answers)
create table game_submissions (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references games(id) on delete cascade not null,
  participant_id uuid references participants(id) on delete cascade not null,
  selected_option_id uuid references game_options(id) not null,
  is_correct boolean default false not null,
  response_ms integer not null,
  points_awarded integer default 0 not null,
  unique(game_id, participant_id)
);

-- Song requests table
create table song_requests (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  participant_id uuid references participants(id) on delete cascade not null,
  song_title text not null,
  artist_name text not null,
  album_art text,
  spotify_uri text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'played')),
  created_at timestamptz default now()
);

-- Announcements table
create table announcements (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade not null,
  message text not null,
  created_at timestamptz default now()
);

-- Song votes table (for jukebox mode)
create table song_votes (
  id uuid primary key default uuid_generate_v4(),
  song_request_id uuid references song_requests(id) on delete cascade not null,
  participant_id uuid references participants(id) on delete cascade not null,
  unique(song_request_id, participant_id)
);

-- Self-referencing FK for fastest_submission_id
alter table games
  add constraint games_fastest_submission_fk
  foreign key (fastest_submission_id) references game_submissions(id);

-- Helper function to increment participant points
create or replace function increment_points(p_id uuid, amount integer)
returns void as $$
begin
  update participants set points = points + amount where id = p_id;
end;
$$ language plpgsql;

-- Indexes for common queries
create index idx_events_code on events(event_code);
create index idx_participants_event on participants(event_id);
create index idx_participants_team on participants(team_id);
create index idx_games_event on games(event_id);
create index idx_game_options_game on game_options(game_id);
create index idx_game_submissions_game on game_submissions(game_id);
create index idx_song_requests_event on song_requests(event_id);
create index idx_announcements_event on announcements(event_id);

-- Enable Realtime for all tables
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table participants;
alter publication supabase_realtime add table games;
alter publication supabase_realtime add table game_options;
alter publication supabase_realtime add table game_submissions;
alter publication supabase_realtime add table song_requests;
alter publication supabase_realtime add table announcements;
alter publication supabase_realtime add table song_votes;

-- Row Level Security (permissive for MVP — tighten for production)
alter table events enable row level security;
alter table teams enable row level security;
alter table participants enable row level security;
alter table games enable row level security;
alter table game_options enable row level security;
alter table game_submissions enable row level security;
alter table song_requests enable row level security;
alter table announcements enable row level security;
alter table song_votes enable row level security;

-- Allow all operations for now (anon key) — restrict in production
create policy "Allow all" on events for all using (true) with check (true);
create policy "Allow all" on teams for all using (true) with check (true);
create policy "Allow all" on participants for all using (true) with check (true);
create policy "Allow all" on games for all using (true) with check (true);
create policy "Allow all" on game_options for all using (true) with check (true);
create policy "Allow all" on game_submissions for all using (true) with check (true);
create policy "Allow all" on song_requests for all using (true) with check (true);
create policy "Allow all" on announcements for all using (true) with check (true);
create policy "Allow all" on song_votes for all using (true) with check (true);
