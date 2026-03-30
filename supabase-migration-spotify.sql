-- Migration: Add Spotify integration fields
-- Run this if you already have the AI features schema deployed

ALTER TABLE events ADD COLUMN IF NOT EXISTS current_song_album_art text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS current_song_spotify_uri text;

ALTER TABLE song_requests ADD COLUMN IF NOT EXISTS album_art text;
ALTER TABLE song_requests ADD COLUMN IF NOT EXISTS spotify_uri text;
