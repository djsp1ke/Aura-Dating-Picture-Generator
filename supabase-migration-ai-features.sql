-- Migration: Add AI features, song request scenarios, and timer settings
-- Run this if you already have the base schema deployed

ALTER TABLE events ADD COLUMN IF NOT EXISTS current_song_title text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS current_song_artist text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS song_request_scenario text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS default_timer_seconds integer DEFAULT 15 NOT NULL;
