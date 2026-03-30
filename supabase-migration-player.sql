-- Migration: Add preview_url for music player
-- Run this if you already have the jukebox migration deployed

ALTER TABLE song_requests ADD COLUMN IF NOT EXISTS preview_url text;
